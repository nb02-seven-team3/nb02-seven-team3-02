import pkg from 'superstruct';
const { object, string, size, integer, array, url, min, partial } = pkg;





export const CreateGroup = object({
    name: size(string(), 1, 10),
    description: size(string(), 1, 60),
    ownerNickname: size(string(), 1, 10),
    ownerPassword: size(string(), 6, 15),
    photoUrl: url(),
    tags: size(array(size(string(), 1, 20)), 1, 10),
    goalRep: min(integer(), 1),
    discordWebhookUrl: url(),
    discordInviteUrl: url()
});

export const PatchGroup = partial(CreateGroup);