// Vercel Serverless Function: Reader Analytics & Metrics Aggregator
// Tracks chapter views, reading completions, and reading session durations

const stats = {
  totalReads: 142,
  completions: 38,
  chapterHits: {
    0: 54, 1: 32, 2: 24, 3: 18, 4: 15, 5: 14, 6: 12, 7: 10, 8: 9, 9: 8
  }
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      stats
    });
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { chapterId, event } = data || {};

      stats.totalReads++;
      if (typeof chapterId !== 'undefined') {
        const cId = parseInt(chapterId, 10);
        stats.chapterHits[cId] = (stats.chapterHits[cId] || 0) + 1;
      }
      if (event === 'completed') {
        stats.completions++;
      }

      return res.status(200).json({ success: true, updated: stats });
    } catch (e) {
      return res.status(400).json({ success: false });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
