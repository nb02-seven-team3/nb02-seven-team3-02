import { object, string, size, integer, array, min, partial, optional } from "superstruct";

export const CreateGroup = object({
    name: size(string(), 1, 10),
    description: size(string(), 1, 60),
    ownerNickname: size(string(), 1, 10),
    ownerPassword: size(string(), 6, 15),
    photoUrl: optional(string()),
    tags: size(array(size(string(), 1, 20)), 1, 10),
    goalRep: min(integer(), 1),
    discordWebhookUrl: string(),
    discordInviteUrl: string()
});

export const PatchGroup = partial(CreateGroup);