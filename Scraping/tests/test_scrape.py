import unittest, pandas as pd
from unittest.mock import patch
import scrape

class TestScrape(unittest.TestCase):

    def test_sitemap(self):
        for sitemap in scrape.SITEMAP:
            self.assertIsNotNone(sitemap)
            self.assertIn("/202", sitemap)


    def test_source_mapper(self):
        sources = ((None, "web"),("", "web"), ("aicarta", "carta-opti"), ("carta", "carta"), ("pippo", "pippo"), ("fromHermes", "prepara per il web"))

        for source, expected  in sources:
            self.assertEqual(expected, scrape.source_mapper(source))

    @patch('scrape.notify', autospec=True)
    def test_notify(self, mock_notify):
        # Test caso di successo
        mock_notify.return_value = {"ok": True}
        self.assertEqual({"ok": True}, scrape.notify("test", "test"))

        mock_notify.side_effect = scrape.slack_sdk.errors.SlackClientError("Slack error")

        self.assertRaises(scrape.slack_sdk.errors.SlackClientError, scrape.notify, "test", "test")

    def test_database_connection(self):
        connection = scrape.database_connection('../db.sqlite')
        self.assertIsNotNone(connection)
        self.assertEqual(tuple, type(connection))

    def test_request_batch(self):
        example_url = scrape.SITEMAP
        responses = scrape.request_batch(example_url)

        self.assertIsNotNone(responses)
        self.assertEqual(list, type(responses))
        self.assertEqual(len(example_url), len(responses))

        for url, response in zip(example_url, responses):
            self.assertIsNotNone(response)

    #il mock è stato generato da AI.
    @patch('scrape.pd.read_sql', autospec=True)
    def test_drop_duplicated_article(self, mock_read_sql):
        input_df = pd.DataFrame({
            "article_url": [
                "A",
                "B",
                "C"
            ]
        })

        mock_read_sql.return_value = pd.DataFrame({
            "article_url": [
                "B",
                "D"
            ]
        })

        result = scrape.drop_duplicated_article(input_df, conn=None)

        expected_df = pd.DataFrame({
            "article_url": [
                "A",
                "C",
            ]
        })

        pd.testing.assert_frame_equal(
            result.reset_index(drop=True),
            expected_df
        )

        # opzionale ma consigliato
        mock_read_sql.assert_called_once()

    @patch('scrape.pd.read_sql', autospec=True)
    def test_prune_url(self, mock):

        mock.return_value = pd.DataFrame({
            "article_url": [
                "url_B",
                "url_D"
            ]
        })


