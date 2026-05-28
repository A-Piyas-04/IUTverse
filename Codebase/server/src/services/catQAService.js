const {
  ensureSupabaseAdmin,
  mapProfile,
  profileSelect,
} = require("../utils/supabaseData");

const mapAnswer = (answer) => ({
  id: answer.id,
  userId: answer.user_id,
  questionId: answer.question_id,
  answer: answer.answer,
  createdAt: answer.created_at,
  updatedAt: answer.updated_at,
  user: mapProfile(answer.user),
});

const mapQuestion = (question) => ({
  id: question.id,
  userId: question.user_id,
  question: question.question,
  createdAt: question.created_at,
  updatedAt: question.updated_at,
  user: mapProfile(question.user),
  answers: (question.answers || []).map(mapAnswer),
});

class CatQAService {
  async getAllQuestions(page = 1, limit = 50) {
    const supabase = ensureSupabaseAdmin();
    const from = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);
    const to = from + Math.min(Number(limit), 100) - 1;

    const { data, error } = await supabase
      .from("cat_questions")
      .select(`*, user:profiles!cat_questions_user_id_fkey(${profileSelect})`)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch questions: ${error.message}`);
    return Promise.all(data.map((question) => this.withAnswers(question)));
  }

  async createQuestion(questionData) {
    const { question, userId } = questionData;
    if (!question || question.trim().length === 0) {
      throw new Error("Question content is required");
    }

    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("cat_questions")
      .insert({ question: question.trim(), user_id: userId })
      .select(`*, user:profiles!cat_questions_user_id_fkey(${profileSelect})`)
      .single();

    if (error) throw new Error(`Failed to create question: ${error.message}`);
    return mapQuestion({ ...data, answers: [] });
  }

  async getQuestionById(questionId) {
    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("cat_questions")
      .select(`*, user:profiles!cat_questions_user_id_fkey(${profileSelect})`)
      .eq("id", Number(questionId))
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch question: ${error.message}`);
    if (!data) throw new Error("Question not found");
    return this.withAnswers(data);
  }

  async addAnswer(answerData) {
    const { questionId, answer, userId } = answerData;
    if (!answer || answer.trim().length === 0) {
      throw new Error("Answer content is required");
    }

    await this.getQuestionById(questionId);

    const supabase = ensureSupabaseAdmin();
    const { data, error } = await supabase
      .from("cat_answers")
      .insert({
        answer: answer.trim(),
        question_id: Number(questionId),
        user_id: userId,
      })
      .select(`*, user:profiles!cat_answers_user_id_fkey(${profileSelect})`)
      .single();

    if (error) throw new Error(`Failed to add answer: ${error.message}`);
    return mapAnswer(data);
  }

  async deleteQuestion(questionId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data: question, error: findError } = await supabase
      .from("cat_questions")
      .select("*")
      .eq("id", Number(questionId))
      .maybeSingle();

    if (findError) throw new Error(`Failed to delete question: ${findError.message}`);
    if (!question) throw new Error("Question not found");
    if (question.user_id !== userId) throw new Error("Unauthorized to delete this question");

    const { error } = await supabase.from("cat_questions").delete().eq("id", Number(questionId));
    if (error) throw new Error(`Failed to delete question: ${error.message}`);
    return { message: "Question deleted successfully" };
  }

  async deleteAnswer(answerId, userId) {
    const supabase = ensureSupabaseAdmin();
    const { data: answer, error: findError } = await supabase
      .from("cat_answers")
      .select("*")
      .eq("id", Number(answerId))
      .maybeSingle();

    if (findError) throw new Error(`Failed to delete answer: ${findError.message}`);
    if (!answer) throw new Error("Answer not found");
    if (answer.user_id !== userId) throw new Error("Unauthorized to delete this answer");

    const { error } = await supabase.from("cat_answers").delete().eq("id", Number(answerId));
    if (error) throw new Error(`Failed to delete answer: ${error.message}`);
    return { message: "Answer deleted successfully" };
  }

  async withAnswers(question) {
    const supabase = ensureSupabaseAdmin();
    const { data: answers, error } = await supabase
      .from("cat_answers")
      .select(`*, user:profiles!cat_answers_user_id_fkey(${profileSelect})`)
      .eq("question_id", question.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch answers: ${error.message}`);
    return mapQuestion({ ...question, answers });
  }
}

module.exports = new CatQAService();
