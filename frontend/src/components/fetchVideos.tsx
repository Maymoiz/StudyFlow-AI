import { useEffect, useState } from "react";
import { sanityFetch } from "../lib/sanityFetch";
import { VIDEOS_BY_TOPIC } from "../lib/queries";

interface SanityVideo {
  _id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
}

export default function TopicVideos({ topicId }: { topicId: string }) {
  const [videos, setVideos] = useState<SanityVideo[]>([]);

  useEffect(() => {
    sanityFetch(VIDEOS_BY_TOPIC, { topicId }).then(setVideos);
  }, [topicId]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {videos.map(video => (
        <div key={video._id} className="video-container">
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>

          <p className="mt-2">{video.title}</p>
        </div>
      ))}
    </div>
  );
}
