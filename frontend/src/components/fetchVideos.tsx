import { useEffect, useState } from "react";
import { sanityFetch } from "../lib/sanityFetch";
import { VIDEOS_BY_TOPIC } from "../lib/queries";

export default function TopicVideos({ topicId }: { topicId: string }) {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    sanityFetch(VIDEOS_BY_TOPIC, { topicId }).then(setVideos);
  }, [topicId]);

  return (
    <div>
      <h2>Videos</h2>
      {videos.map((v: any) => (
        <div key={v._id}>
          <img src={v.thumbnail} width={200} />
          <p>{v.title}</p>
        </div>
      ))}
    </div>
  );
}
