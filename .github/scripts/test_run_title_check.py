"""Offline regression for the adapter's first API read failure."""
import unittest
from run_title_check import run


class FirstReadFailure(unittest.TestCase):
    def test_first_read_posts_error_to_event_commit_without_success(self):
        calls = []
        event_sha = 'a' * 40

        def api(method, path, payload=None):
            calls.append((method, path, payload))
            if method == 'GET':
                raise OSError('injected first-read failure')
            return {}

        with self.assertRaises(OSError):
            run(api, 'soliskit/tetris-js', 413, event_sha)
        self.assertEqual(calls[0], ('GET', '/repos/soliskit/tetris-js/pulls/413', None))
        self.assertEqual(calls[1:], [('POST', '/repos/soliskit/tetris-js/statuses/' + event_sha,
                                     {'state': 'error', 'context': 'PR title',
                                      'description': 'Title could not be verified.'})])


if __name__ == '__main__':
    unittest.main()
