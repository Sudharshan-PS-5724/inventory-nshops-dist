import contextlib
import importlib.util
import io
import pathlib
import socket
import sys
import unittest
from unittest import mock

SCRIPT = pathlib.Path(__file__).parents[1] / "scale_compatibility_check.py"
SPEC = importlib.util.spec_from_file_location("scale_compatibility_check", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class FrameExamplesTest(unittest.TestCase):
    def test_a_documented_example_and_address(self):
        value = MODULE.parse_frame("a", bytes.fromhex("FF 14 65 23 00 03 62 05 00 03 29 13 00 C8"))
        self.assertEqual(value["weight"], "2.365")
        self.assertEqual(value["unit_price"], "5.62")
        self.assertEqual(value["amount"], "13.29")
        self.assertEqual(value["configured_address_not_global_id"], 200)
        self.assertTrue(value["stable"])

    def test_a_accumulation_flags_are_not_treated_as_sale(self):
        frame = bytearray.fromhex("FF 14 65 23 00 03 62 05 00 03 29 13 00 C8")
        frame[1] |= 0x40
        frame[5] |= 0x08
        frame[9] |= 0x08
        value = MODULE.parse_frame("a", frame)
        self.assertTrue(value["accumulation_or_total_mode"])
        self.assertTrue(value["price_is_accumulated_count"])
        self.assertTrue(value["amount_is_accumulated"])

    def test_b_c_d_e_examples(self):
        examples = {
            "b": ("FF 44 65 23 00 00", "2.365"),
            "c": ("57 54 53 54 2B 20 20 32 2E 33 36 35 20 20 6B 67 0D 0A", "2.365"),
            "d": ("3D 35 36 33 2E 32 20 20", "2.365"),
            "e": ("02 2B 30 30 32 33 36 35 33 31 41 03", "2.365"),
        }
        for protocol, (hexadecimal, expected) in examples.items():
            with self.subTest(protocol=protocol):
                self.assertEqual(MODULE.parse_frame(protocol, bytes.fromhex(hexadecimal))["weight"], expected)

    def test_invalid_checksum_and_bcd_are_rejected(self):
        self.assertIsNone(MODULE.parse_frame("e", bytes.fromhex("02 2B 30 30 32 33 36 35 33 31 42 03")))
        self.assertIsNone(MODULE.parse_frame("b", bytes.fromhex("FF 44 6A 23 00 00")))

    def test_f_and_g_are_overlapping_and_not_scaled(self):
        frame = bytes.fromhex("0A0D2032333635202020203536322020202031333239")
        result = MODULE.find_candidates(frame)
        self.assertEqual(result["F"]["samples"][0]["fields"]["weight_digits_raw"], "2365")
        self.assertIn("G", result)
        self.assertNotIn("weight", result["F"]["samples"][0]["fields"])

    def test_h_response_and_error(self):
        self.assertEqual(MODULE.parse_frame("h", bytes.fromhex("02 20 20 32 2E 33 36 35 20 4B 47"))["weight"], "2.365")
        self.assertEqual(MODULE.parse_frame("h", b"?????")["status"], "unstable or negative per document")

    def test_detects_frames_after_noise_and_multiple_frames(self):
        data = b"junk" + bytes.fromhex("FF 44 65 23 00 00") * 2
        result = MODULE.find_candidates(data, "b")
        self.assertEqual(result["B"]["candidate_frames"], 2)
        self.assertEqual(result["B"]["samples"][0]["offset"], 4)


class SafetyTest(unittest.TestCase):
    def test_active_operations_need_explicit_acknowledgement(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                MODULE.main(["serial", "--port", "COM3", "--baud", "9600", "--send-h-request"])
            with self.assertRaises(SystemExit):
                MODULE.main(["network", "--host", "127.0.0.1", "--request-statement", "1"])

    def test_serial_open_never_writes_unless_opted_in(self):
        class FakeConnection:
            writes = []
            def __enter__(self): return self
            def __exit__(self, *args): return None
            def read(self, n): return b""
            def write(self, b): self.writes.append(b)
            def flush(self): pass
        connection = FakeConnection()
        fake_serial = mock.Mock(EIGHTBITS=8, PARITY_NONE="N", STOPBITS_ONE=1)
        fake_serial.Serial.return_value = connection
        args = MODULE.build_parser().parse_args(["serial", "--port", "COM3", "--baud", "9600", "--duration", "0.001"])
        with mock.patch.dict(sys.modules, {"serial": fake_serial}):
            result = MODULE.serial_capture(args)
        self.assertEqual(connection.writes, [])
        self.assertEqual(result["result"], "no_bytes_received")

    def test_network_connect_only_does_not_send_data(self):
        connection = mock.MagicMock()
        connection.__enter__.return_value = connection
        args = MODULE.build_parser().parse_args(["network", "--host", "192.168.1.99"])
        with mock.patch.object(MODULE.socket, "create_connection", return_value=connection):
            result = MODULE.network_probe(args)
        connection.sendall.assert_not_called()
        self.assertEqual(result["result"], "tcp_connected")

    def test_network_reads_fragmented_documented_no_data_response(self):
        connection = mock.MagicMock()
        connection.__enter__.return_value = connection
        connection.recv.side_effect = [b"0j0001", b"ac\x03"]
        args = MODULE.build_parser().parse_args(["network", "--host", "192.168.1.99", "--request-statement", "1", "--acknowledge-unknown-effects"])
        with mock.patch.object(MODULE.socket, "create_connection", return_value=connection):
            result = MODULE.network_probe(args)
        connection.sendall.assert_called_once_with(b"!0J0001A\r\n\x03")
        self.assertEqual(result["result"], "documented_no_data_shape")

    def test_network_timeout_is_inconclusive_and_keeps_partial_data(self):
        connection = mock.MagicMock()
        connection.__enter__.return_value = connection
        connection.recv.side_effect = [b"0j", socket.timeout()]
        args = MODULE.build_parser().parse_args(["network", "--host", "192.168.1.99", "--request-statement", "1", "--acknowledge-unknown-effects"])
        with mock.patch.object(MODULE.socket, "create_connection", return_value=connection):
            result = MODULE.network_probe(args)
        self.assertEqual(result["result"], "incomplete_or_no_reply")
        self.assertEqual(result["response_hex_first_512_bytes"], "30 6a")


if __name__ == "__main__":
    unittest.main()
