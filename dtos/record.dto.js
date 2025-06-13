// dtos/record.dto.js

// 요청에서 Record 생성 DTO로 변환
export function toCreateRecordDTO(body, files) {
    return {
        participantId: Number(body.participantId),
        nickname: String(body.nickname),
        password: String(body.password),
        exerciseType: String(body.exerciseType),
        description: String(body.description ?? ''),
        time: Number(body.time),
        distance: Number(body.distance),
        photos: files ? files.map(f => f.filename) : [],
    };
}

// Record DB객체 → API 응답 DTO로 변환
export function toRecordResponseDTO(record) {
    return {
        id: record.id,
        exerciseType: record.exerciseType,
        description: record.description,
        time: record.time,
        distance: record.distance,
        photos: record.photos,
        author: {
            id: record.participant.id,
            nickname: record.participant.nickname,
        },
    };
}