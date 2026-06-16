export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
  };
}

export default function AITutorVideos({ videos }: { videos: YouTubeVideo[] }) {
  if (!videos || videos.length === 0) {
    return <p className="text-gray-400">No videos found</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {videos.map((video) => (
        <div key={video.id.videoId} className="rounded overflow-hidden shadow">
          <iframe
            width="100%"
            height="220"
            src={`https://www.youtube.com/embed/${video.id.videoId}`}
            title={video.snippet.title}
            className="rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>

          <p className="mt-2 font-medium text-sm px-2">
            {video.snippet.title}
          </p>
        </div>
      ))}
    </div>
  );
}
