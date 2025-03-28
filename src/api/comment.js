import axios from "@/utils/request";

/**
 * 评论部分
 */

/**
 * 获取评论
 * @param {number} id - 对应资源的id
 * @param {number} [offset=0] - 分页的偏移量，默认为0
 * @param {number|null} [before=null] - 获取早于某一条评论的评论，默认为null
 * @param {string} [type="music"] - 对应资源的类型，默认为"music"
 */
export const getComment = (id, offset = 0, before = null, type = "music") => {
  return axios({
    method: "GET",
    url: `/comment/${type}`,
    params: {
      id,
      offset,
      before,
      time: new Date().getTime(),
    },
  });
};

/**
 * 评论点赞
 * @param {number} id - 对应资源的id
 * @param {number} cid - 评论的id
 * @param {number} t - 是否点赞，0为取消点赞，1为点赞
 * @param {number} [type=0] - 对应资源的类型，默认为0（歌曲）
 */
export const likeComment = (id, cid, t, type = 0) => {
  return axios({
    method: "GET",
    loadingBar: "Hidden",
    url: "/comment/like",
    params: {
      id,
      cid,
      t,
      type,
      time: new Date().getTime(),
    },
  });
};
