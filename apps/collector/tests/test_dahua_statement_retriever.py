import importlib.util
import pathlib
import sys
import unittest

SCRIPT = pathlib.Path(__file__).parents[1] / "dahua_statement_retriever.py"
SPEC = importlib.util.spec_from_file_location("dahua_statement_retriever", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class DahuaStatementRetrieverTest(unittest.TestCase):
    def test_documented_command_has_cr_lf_etx_terminator(self) -> None:
        self.assertEqual(MODULE.build_statement_command(1), b"!0J0001A\r\n\x03")

    def test_no_data_response_is_not_misreported_as_a_sale(self) -> None:
        self.assertIsNone(MODULE.parse_statement_reply(b"0j0001ac\x03", 1))

    def test_documented_example_parses_known_fields_and_preserves_unknown_tail(self) -> None:
        raw = b"0j0001a090327160900030001000780020000000160000016000000200000401bc\x03"
        record = MODULE.parse_statement_reply(raw, 1)
        assert record is not None
        self.assertEqual(record.plu_sequence, "0001")
        self.assertEqual(record.weight_raw, "00078")
        self.assertEqual(record.unit_price_raw, "002000")
        self.assertEqual(record.total_after_discount_raw, "0000160")
        self.assertEqual(record.undocumented_tail, "00000200000401bc")


if __name__ == "__main__":
    unittest.main()
