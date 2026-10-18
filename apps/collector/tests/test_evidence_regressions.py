import contextlib
import io
import json
import unittest
from unittest.mock import patch
import dahua_statement_retriever as retriever
from collector.outbox import Outbox, RawStatement


class EvidenceRegressionTest(unittest.TestCase):
    def test_raw_evidence_survives_decode_failure(self):
        output = io.StringIO()
        with patch('sys.argv', ['probe', '--host', 'unused', '--raw']), patch.object(retriever, 'request_statement', return_value=b'\xff\x03'), contextlib.redirect_stdout(output):
            with self.assertRaises(retriever.DahuaProtocolError):
                retriever.main()
        self.assertEqual(json.loads(output.getvalue())['response_hex'], 'ff 03')

    def test_identical_retries_are_safe_but_identity_collisions_fail(self):
        box = Outbox(':memory:')
        try:
            original = RawStatement('machine', 0, 1, b'original')
            box.store(original)
            box.store(original)
            with self.assertRaises(ValueError):
                box.store(RawStatement('machine', 0, 1, b'changed'))
            self.assertEqual(box.connection.execute('select payload from raw_statements').fetchall(), [(b'original',)])
            box.store(RawStatement('another-machine', 0, 1, b'other'))
            self.assertEqual(box.connection.execute('select count(*) from raw_statements').fetchone()[0], 2)
        finally:
            box.close()
