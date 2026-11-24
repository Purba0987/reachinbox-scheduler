import { esClient, EMAIL_JOBS_INDEX } from '../config/elasticsearch';
import { prisma } from '../config/db';

export interface EmailJobDocument {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  senderEmail?: string | null;
  batchId?: string | null;
  createdAt: Date | string;
}

export async function indexEmailJobInElasticsearch(doc: EmailJobDocument) {
  try {
    await esClient.index({
      index: EMAIL_JOBS_INDEX,
      id: doc.id,
      body: {
        id: doc.id,
        recipientEmail: doc.recipientEmail,
        subject: doc.subject,
        body: doc.body,
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        sentAt: doc.sentAt,
        senderEmail: doc.senderEmail,
        batchId: doc.batchId,
        createdAt: doc.createdAt,
      },
    });
  } catch (error: any) {
    console.warn(`[Elasticsearch] Indexing doc ${doc.id} skipped or failed: ${error.message}`);
  }
}

export async function searchEmailJobsFromElasticsearch(options: {
  query?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const from = (page - 1) * limit;

  try {
    const mustClauses: any[] = [];

    if (options.query && options.query.trim() !== '') {
      mustClauses.push({
        multi_match: {
          query: options.query.trim(),
          fields: ['recipientEmail^3', 'subject^2', 'body', 'senderEmail'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (options.status && options.status !== 'ALL') {
      mustClauses.push({
        term: {
          status: options.status,
        },
      });
    }

    const response = await esClient.search({
      index: EMAIL_JOBS_INDEX,
      from,
      size: limit,
      body: {
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
        sort: [{ scheduledAt: { order: 'desc' } }],
      },
    });

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value || 0);

    const items = response.hits.hits.map((hit: any) => hit._source);

    return {
      source: 'elasticsearch',
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: items,
    };
  } catch (error: any) {
    // Resilient Fallback to Database Query if Elasticsearch is unavailable
    console.warn(`[Elasticsearch Search Fallback to DB]: ${error.message}`);
    return searchEmailJobsFromDatabase(options);
  }
}

export async function searchEmailJobsFromDatabase(options: {
  query?: string;
  status?: any;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.query && options.query.trim() !== '') {
    const q = options.query.trim();
    where.OR = [
      { recipientEmail: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { body: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.emailJob.count({ where }),
    prisma.emailJob.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: { sender: true },
    }),
  ]);

  return {
    source: 'database',
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data,
  };
}
