import { object, string, size, integer, array, min, partial, define } from "superstruct";
import isurl from "is-url";


const Url = define('Url', isurl)


export const CreateGroup = object({
    name: size(string(), 1, 10),
    description: size(string(), 1, 60),
    ownerNickname: size(string(), 1, 10),
    ownerPassword: size(string(), 6, 15),
    photoUrl: string(),
    tags: size(array(size(string(), 1, 20)), 1, 10),
    goalRep: min(integer(), 1),
    discordWebhookUrl: string(),
    discordInviteUrl: string()
});

export const PatchGroup = partial(CreateGroup);