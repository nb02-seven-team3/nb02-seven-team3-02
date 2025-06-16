import { object, string, size, integer, array, min, partial, define } from "superstruct";
import isurl from "is-url";


const Url = define('Url', isurl)


export const CreateGroup = object({
    name: size(string(), 1, 10),
    description: size(string(), 1, 60),
    ownerNickname: size(string(), 1, 10),
    ownerPassword: size(string(), 6, 15),
    photoUrl: Url,
    tags: size(array(size(string(), 1, 20)), 1, 10),
    goalRep: min(integer(), 1),
    discordWebhookUrl: Url,
    discordInviteUrl: Url
});

export const PatchGroup = partial(CreateGroup);