import axios from 'axios';
import useSWR from 'swr';

import { getRefreshToken, getToken, removeToken } from './auth';
import { publishedOnDate, secondsToHHMMSS } from './helper';
import {
  IEncodedH264VideoArray,
  IEncodedVideo,
  IEncodedVideoArray,
  IExtendedEncodedVideo,
  IPostMeta,
  IVideoDetails,
} from './types';

export const baseUrl = process.env.NEXT_PUBLIC_VCMS_HOST || 'nobaseURL';

const userFetcher = (url: string) =>
  axios
    .get(url, {
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${getToken()}`,
      },
    })
    .then((res) => res.data);

export async function refreshUser() {
  return axios.post(
    `${baseUrl}/spa/token/refresh/`,
    {
      refresh: getRefreshToken(),
    },
    {
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${getToken()}`,
      },
    }
  );
}

export async function loginUser(formdata: Record<string, unknown>) {
  return axios.post(`${baseUrl}/spa/token/`, formdata, {
    withCredentials: false,
    headers: { 'Content-Type': 'application/json' },
  });
}
export async function logoutUser() {
  try {
    await axios.post(
      `${baseUrl}/spa/token/logout/`,
      {},
      {
        headers: { Authorization: `JWT ${getToken()}` },
      }
    );
    return removeToken();
  } catch (error) {
    return removeToken();
  }
}

export function useUser() {
  const {
    data: userData,
    mutate: userMutate,
    error: userError,
  } = useSWR(`${baseUrl}/spa/auth/users/me/`, userFetcher);
  const loading: boolean = !userData && !userError;
  const isAuthenticated: boolean =
    userData && userData.id !== undefined && !userError ? true : false;

  return {
    loading,
    isAuthenticated,
    user: userData,
    userMutate,
    userError,
  };
}

export function useUserMedia() {
  const { data: user, error: userError } = useSWR(
    `${baseUrl}/spa/auth/users/me/`,
    userFetcher
  );
  const { data: media, error: mediaError } = useSWR(
    user ? `${baseUrl}/spa/video/?author=${user.username}` : null,
    userFetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
    }
  );

  const userLoading = !user && !userError;
  const mediaLoading = !media && !mediaError;
  const hasError: boolean = userError && mediaError;

  return {
    hasError,
    userLoading,
    mediaLoading,
    media,
  };
}

export function useVideoDetail(videoID: string) {
  // need to check that videoID is a string. As types throws error on useRouter...
  // we also check videoID is not 'null' or 'undefined as the VideoPage [videoID].tsx
  // passes this as a string
  // TODO: chore: refactor, could be cleaner
  const shouldFetch =
    videoID &&
    videoID !== 'null' &&
    videoID !== null &&
    videoID !== 'undefined' &&
    videoID !== undefined;

  const {
    data: video,
    error: videoError,
    mutate: videoMutate,
  } = useSWR<IVideoDetails>(
    shouldFetch ? `${baseUrl}/spa/video/${videoID}` : null,
    userFetcher,
    {
      refreshInterval: 500,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      revalidateOnReconnect: false,
    }
  );

  const formattedDuration = video?.duration
    ? secondsToHHMMSS(video.duration)
    : '';

  const dateModified = publishedOnDate(
    new Date(video?.edit_date ? video.edit_date : ''),
    3
  );
  const datePublished = publishedOnDate(
    new Date(video?.add_date ? video.add_date : ''),
    3
  );

  const videoThumbnailURL = video?.thumbnail_url
    ? baseUrl + video?.thumbnail_url
    : undefined;
  const videoThumbnailTime = video?.thumbnail_time
    ? baseUrl + video?.thumbnail_time
    : undefined;
  const videoSpritesURL = video?.sprites_url
    ? baseUrl + video.sprites_url
    : undefined;
  const videoPreviewURL = video?.preview_url
    ? baseUrl + video?.preview_url
    : undefined;
  const hlsAssets: Record<string, unknown> =
    video && video.hls_info ? video.hls_info : {};
  const hlsMasterFile = hlsAssets?.master_file;

  // TODO: video returns true with just videoID, need to fix that, for now check if we have formattedDuration
  const videoLoading = !videoError && !formattedDuration;
  const hasError = videoError;

  const postMeta: IPostMeta = {
    title: video?.title ? video.title : '',
    state: video?.state ? video.state : '',
    datePublished,
    dateModified,
    formattedDuration,
  };

  const videoImageAssets = {
    videoThumbnailURL,
    videoThumbnailTime,
    videoSpritesURL,
    videoPreviewURL,
    videoPosterURL: video?.poster_url ? baseUrl + video?.poster_url : undefined,
  };

  const encodedFilesArray: IEncodedVideoArray = [];
  const encodedH264FilesArray: IEncodedH264VideoArray = [];
  // eslint-disable-next-line unused-imports/no-unused-vars
  const encodingAssets =
    video?.encodings_info &&
    Object.keys(video?.encodings_info).map((key) => {
      const encodedFiles = Object.keys(video?.encodings_info[key]).map(
        (key2) => {
          // TODO: fix typing of key2
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const encodedVideo: IEncodedVideo = video.encodings_info[key][key2];
          const extendedEncodedVideo: IExtendedEncodedVideo = {
            resolution: key,
            encoder: key2,
            thumbnail: video.thumbnail_url,
            preview: video.preview_url,
            ...encodedVideo,
          };
          encodedFilesArray.push({
            ...extendedEncodedVideo,
          });
          if (extendedEncodedVideo.encoder === 'h264') {
            encodedH264FilesArray.push({
              name: extendedEncodedVideo.title || 'pending',
              url: baseUrl + extendedEncodedVideo.url,
            });
          }
        }
      );
      return encodedFiles;
    });

  return {
    hasError,
    videoLoading,
    videoMutate,
    video,
    postMeta,
    videoImageAssets,
    encodedFilesArray,
    encodedH264FilesArray,
    hlsAssets,
    hlsMasterFile,
  };
}

export function useSession() {
  const { data, mutate, error } = useSWR(
    `${baseUrl}/spa/session/`,
    userFetcher
  );

  const isAuthenticated = data?.isAuthenticated;
  const loading = !data && !error;

  return {
    isAuthenticated,
    loading,
    session: data,
    mutate,
  };
}

// export async function getCSRF() {
//   try {
//     const res = await axios
//       .get('https://vcms-ssl.capt.nonovium.com/spa/csrf/', {
//         withCredentials: true,
//       })
//       .then((res) => res.headers['x-csrftoken']);
//     return res;
//   } catch (error) {
//     return 'Error';
//   }
// }
// Function that will be called to refresh authorization
// const refreshAuthLogic = (failedRequest: {
//   response: { config: { headers: { [x: string]: string } } };
// }) =>
//   axios
//     .post(
//       `${baseUrl}/spa/token/refresh/`,
//       {
//         refresh: getRefreshToken(),
//       },
//       {
//         withCredentials: false,
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `JWT ${getToken()}`,
//         },
//       }
//     )
//     .then((tokenRefreshResponse) => {
//       console.log('tokenRefreshResponse', tokenRefreshResponse);
//       setTokens(
//         tokenRefreshResponse.data.access,
//         tokenRefreshResponse.data.refresh
//       );
//       failedRequest.response.config.headers['Authorization'] =
//         'JWT ' + tokenRefreshResponse.data.access;
//       return Promise.resolve();
//     });
// // instantiate the interceptor
// createAuthRefreshInterceptor(axios, refreshAuthLogic);
