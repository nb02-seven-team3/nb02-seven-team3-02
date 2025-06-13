// dtos/record.dto.js
import { object, string, number, optional } from "superstruct";

// superstruct: 운동 기록 등록 요청 검증용 스키마
export const CreateRecord = object({
    participantId: number(),
    nickname: string(),
    password: string(),
    exerciseType: string(),
    description: optional(string()),
    time: number(),
    distance: number(),
});

// 한글 운동명 → 영문 코드 변환 함수
export function mapExerciseType(type) {
    switch (type) {
        case '러닝': return 'run';
        case '사이클링': return 'cycle';
        case '수영': return 'swim';
        default: return type;
    }
}

// description을 항상 객체로 반환
export function mapDescription(desc) {
    if (!desc || desc === "") return {};
    return { text: desc };
}