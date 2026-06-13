import groq from "groq";

export const userQuery = `*[_type == "user"]{
  _id,
  name,
  email,
  profileImage,
  role
}`;

// Get all subjects
export const SUBJECTS_QUERY = groq`
  *[_type == "subject"]{
    _id,
    name,
    description,
    icon
  }
`;

// Get topics for a subject
export const TOPICS_BY_SUBJECT = groq`
  *[_type == "topic" && subject._ref == $subjectId]{
    _id,
    name,
    description
  }
`;

// Get videos for a topic
export const VIDEOS_BY_TOPIC = groq`
  *[_type == "video" && topic._ref == $topicId]{
    _id,
    title,
    youtubeId,
    thumbnail,
    duration,
    tags
  }
`;

// Search videos by keyword
export const SEARCH_VIDEOS = groq`
  *[_type == "video" && title match $query]{
    _id,
    title,
    youtubeId,
    thumbnail,
    duration,
    tags
  }
`;

// Get recommended videos for a user
export const USER_RECOMMENDATIONS = groq`
  *[_type == "userProfile" && uid == $uid][0]{
    recommendedVideos[]->{
      _id,
      title,
      youtubeId,
      thumbnail,
      duration
    }
  }
`;
