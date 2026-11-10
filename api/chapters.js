// Vercel Serverless Function: Dynamic Chapter Metadata API
// Delivers word counts, estimated read times, volume grouping, and synopsis data

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const catalog = {
    series: "Just a Little While Apart",
    author: "Mohammad Aslam",
    totalVolumes: 5,
    volume1: {
      title: "The End of the Beginning",
      chaptersCount: 10,
      totalWords: 24245,
      estimatedReadingTimeMinutes: 105,
      status: "Complete",
      access: "Free"
    },
    volume2: {
      title: "The Anatomy of a Burnt Kettle",
      chaptersCount: 10,
      status: "In Progress",
      access: "Paid"
    }
  };

  return res.status(200).json({ success: true, catalog });
}
