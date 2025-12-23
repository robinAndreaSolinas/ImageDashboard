import unittest

import scrape

class TestScrape(unittest.TestCase):

    def test_database_connection(self):
        connection = scrape.database_connection('../db.sqlite')
        self.assertIsNotNone(connection)
        self.assertEqual(tuple, type(connection))

    def test_request_batch(self):
        example_url = ["https://example.com", "http://example.com/pippo", "https://google.com", ""]
        responses = scrape.request_batch(example_url)
        self.assertIsNotNone(responses)
        self.assertEqual(list, type(responses))


        self.assertEqual(3, len(responses))

        for url, response in zip(example_url, responses):
            self.assertIsNotNone(response)