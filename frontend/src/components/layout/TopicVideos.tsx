import { useEffect, useState } from "react";
import { sanityFetch } from "../../lib/sanityFetch";
import { VIDEOS_BY_TOPIC } from "../../lib/queries";

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

  if (!videos || videos.length === 0) {
    return <p className="text-gray-400">No topic videos found</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {videos.map((video) => (
        <div key={video._id} className="rounded overflow-hidden shadow">
          <iframe
            width="100%"
            height="220"
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            className="rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>

          <p className="mt-2 font-medium text-sm px-2">{video.title}</p>
        </div>
      ))}
    </div>
  );
}
