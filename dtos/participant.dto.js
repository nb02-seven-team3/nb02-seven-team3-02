import { object, string, size } from "superstruct";

export const CreateParticipant = object({
    nickname: size(string(), 1, 10),
    password: size(string(), 6, 15)
});
