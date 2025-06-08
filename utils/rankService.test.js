const { calculateRank } = require('./rankService');

test('점수 높은 순으로 정렬 + 랭크 부여 확인', () => {
  const input = [
    { consumer_name: 'A', score: 10 },
    { consumer_name: 'B', score: 30 },
    { consumer_name: 'C', score: 20 },
  ];

  const result = calculateRank(input);

  expect(result); ([
    { rank: 1, consumer_name: 'B', score: 30 },
    { rank: 2, consumer_name: 'C', score: 20 },
    { rank: 3, consumer_name: 'A', score: 10 },
  ]);
});
