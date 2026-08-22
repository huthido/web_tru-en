/**
 * Import file này ĐẦU TIÊN trong mọi script ops: tắt autorun của các BullMQ
 * processor (TtsProcessor…) để context Nest của script không lấy job khỏi
 * queue rồi bỏ dở khi script thoát.
 */
process.env.BULL_PROCESSORS_DISABLED = '1';
