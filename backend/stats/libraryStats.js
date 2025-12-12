export async function fetchLibraryStats(esClient, indexName) {
  try {
    const response = await esClient.search({
      index: indexName,
      size: 0,
      aggs: {
        // Use keyword field directly (mapping sets primaryEmotions as keyword)
        emotions_count: { terms: { field: 'primaryEmotions', size: 20 } },
        avg_confidence: { avg: { field: 'confidence' } },
      },
    });

    const total = (response.hits?.total && response.hits.total.value) ? response.hits.total.value : 0;
    const avgConfidence = response.aggregations?.avg_confidence?.value || 0;
    const emotionBuckets = response.aggregations?.emotions_count?.buckets || [];

    const emotions = {};
    emotionBuckets.forEach((bucket) => {
      if (!bucket.key && bucket.key !== 0) {
        return;
      }
      emotions[bucket.key] = bucket.doc_count;
    });

    const topEmotion = emotionBuckets.length ? emotionBuckets[0].key : '';

    return {
      total,
      emotions,
      averageConfidence: Number(avgConfidence.toFixed(2)),
      topEmotion,
    };
  } catch (error) {
    if (error.meta && error.meta.body && error.meta.body.status === 404) {
      return { total: 0, emotions: {}, averageConfidence: 0, topEmotion: '' };
    }
    throw error;
  }
}
