//점수 계산, 랭크 순위 매김

function calculateRank(data) {
  // score 내림차순 정렬
  const sorted = [data].sort((a, b) => b.score - a.score);

  // 순위 부여
  return sorted.map((item, index) => ({
    rank: index + 1,
    consumer_name: item.consumer_name,
    score: item.score
  }));
}

module.exports = { calculateRank };