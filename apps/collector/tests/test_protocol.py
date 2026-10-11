import unittest

from collector.protocol import ProtocolVerificationRequired, parse_statement_reply, statement_request


class StatementProtocolTest(unittest.TestCase):
    def test_builds_documented_read_request(self) -> None:
        self.assertEqual(statement_request(42), b"!0J0042A\r\n\x03")

    def test_rejects_unverified_parsing(self) -> None:
        with self.assertRaises(ProtocolVerificationRequired):
            parse_statement_reply(b"unverified")


if __name__ == "__main__":
    unittest.main()
