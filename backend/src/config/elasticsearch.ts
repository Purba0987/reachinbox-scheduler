import { Client } from '@elastic/elasticsearch';
import { config } from './index';

export const esClient = new Client({
  node: config.elasticsearchUrl,
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  } : undefined,
});

export const EMAIL_JOBS_INDEX = 'email_jobs';

export async function initializeElasticsearch() {
  try {
    const ping = await esClient.ping();
    if (!ping) {
      console.warn('⚠️ Elasticsearch ping failed or unreachable.');
      return;
    }

    const indexExists = await esClient.indices.exists({ index: EMAIL_JOBS_INDEX });
    if (!indexExists) {
      await esClient.indices.create({
        index: EMAIL_JOBS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              senderEmail: { type: 'keyword' },
              batchId: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`✅ Elasticsearch index '${EMAIL_JOBS_INDEX}' initialized.`);
    } else {
      console.log(`✅ Elasticsearch index '${EMAIL_JOBS_INDEX}' exists and ready.`);
    }
  } catch (error: any) {
    console.warn(`⚠️ Elasticsearch initialization warning: ${error.message}. (Elasticsearch may be offline, search will fall back to DB)`);
  }
}
