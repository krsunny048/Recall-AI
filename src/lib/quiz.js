function calculateQuizScore(answers, totalQuestions) {
  if (totalQuestions <= 0) return 0;
  const correct = answers.reduce((count, answer) => count + (answer.isCorrect ? 1 : 0), 0);
  return Math.round(correct / totalQuestions * 100);
}
function getIncorrectQuestionIds(answers) {
  return answers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId);
}
export {
  calculateQuizScore,
  getIncorrectQuestionIds
};
