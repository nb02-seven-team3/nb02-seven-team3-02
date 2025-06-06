# nb02-seven-team3-02

## 3팀
(팀 협업 문서 링크 게시)
---

### 팀원 구성
권은혜 (https://github.com/3023kk)
고민재 (https://github.com/nbkominjae)
박건영 (https://github.com/geonyoung28)
윤희원 (https://github.com/yun-heewon)
진성남 (https://github.com/jinseongnam)

---


### 프로젝트 소개
프로그래밍 교육 사이트의 백엔드 시스템 구축
프로젝트 기간: 2025.06.02 ~ 2025.06.20

###
기술 스택
Backend: Express.js, PrismaORM
Database: PostgreSQL
공통 Tool: Git & Github, Discord

```mermaid
erDiagram
    Group ||--o{ GroupTag: has
    GroupTag }o--|| Tag : has
    Group ||--|| User : owner
    Group ||--|{ Participant : participate
    Participant }|--|| User : participate
    Rank ||--|| Group : update
    Record }o--|| User : record
    Record }o--|| Group : record

    Tag {
        Int     id              PK
        String  name
        Date    createdAt
        Date    updatedAt
    }
    Group { 
        Int     id              PK
        Int     ownerId         FK "User.id"
        String  name
        String  description
        String  photoUrl
        Int     goalRep
        String  discordWebhookUrl
        String  discordInviteUrl
        Array   badges
        Int     likeCount
        Date    createdAt
        Date    updatedAt
    }
    GroupTag {
        Int     id              PK
        Int     groupId         FK "Group.id"
        Int     tagId           FK "Tag.id"
        Date    createdAt
        Date    updatedAt
    }
    User {
        Int     id              PK
        String  nickname
        String  password
        Date    createdAt
        Date    updatedAt
    }
    Participant {
        Int     id              PK
        Int     userId          FK "User.id"
        Int     groupId         FK "Group.id"
        Date    createdAt
        Date    updatedAt
    }
    Record {
        Int     id              PK
        String  exerciseType
        String  description
        Int     time
        Int     distance
        Array   photos
        Int     authorId        FK "User.id"
        Int     groupId         FK "Group.id"
        Date    createdAt
        Date    updatedAt
    }
    Rank {
        Int     id              PK
        Int     groupId         FK "Group.id"
        Int     recordCount
        Int     recordTime
        Date    createdAt
        Date    updatedAt
    }
```
