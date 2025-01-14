import StatBarCard from '@SuperSuperUI/statistics/StatBarCard';
import { useEffect, useState } from 'react';

import { useVideoDetail } from '@/lib/api';
import { secondsToHHMMSS } from '@/lib/helper';

type HeaderStatsBarProps = {
  videoID: string;
};
export default function HeaderStatsBar({ videoID }: HeaderStatsBarProps) {
  const { video } = useVideoDetail(videoID);

  const formattedDuration = video?.duration
    ? secondsToHHMMSS(video.duration)
    : '-';

  const [statsArray, setStatsArray] = useState([
    {
      statTitle: 'Duration',
      statValue: video?.duration ? formattedDuration : '-',
    },
    {
      statTitle: 'Size',
      statValue: video?.size ? video.size.toString() : '0',
    },
    {
      statTitle: 'Status',
      statValue: video?.encoding_status ? video.encoding_status : 'unknown',
    },
  ]);

  useEffect(() => {
    if (video) {
      setStatsArray([
        {
          statTitle: 'Duration',
          statValue: video.duration ? formattedDuration : '-',
        },
        {
          statTitle: 'Size',
          statValue: video.size ? video.size.toString() : '0',
        },
        {
          statTitle: 'Status',
          statValue: video.encoding_status ? video.encoding_status : 'unknown',
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.duration, video?.size, video?.encoding_status]);

  return (
    <>
      {!video ? (
        <div>Video Loading</div>
      ) : (
        <StatBarCard statsArray={statsArray} />
      )}
    </>
  );
}
