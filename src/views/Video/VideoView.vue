<template>
  <div class="video">
    <section class="mainVideo">
      <video ref="videoRef" class="plyr" />
      <div class="info" v-if="videoData">
        <span class="title">{{ videoData.name }}</span>
        <AllArtists :artistsData="videoData.artists" />
        <n-ellipsis
          v-if="videoData.desc"
          class="desc"
          expand-trigger="click"
          line-clamp="3"
          :tooltip="false"
          v-html="videoData.desc.replace(/\n/g, '<br>')"
        />
        <div class="num">
          <span class="playCount">
            <n-icon :component="OndemandVideoFilled" />
            {{ formatNumber(videoData.playCount) }} 次播放
          </span>
          <span class="shareCount">
            <n-icon :component="ShareFilled" />
            {{ formatNumber(videoData.shareCount) }} 次分享
          </span>
          <span class="commentCount">
            <n-icon :component="MessageOutlined" />
            {{ formatNumber(videoData.commentCount) }} 条评论
          </span>
        </div>
      </div>
      <div class="comment" v-if="commentData.allComments[0]">
        <div class="hotComments" v-if="commentData.hotComments[0]">
          <n-h6 prefix="bar"> 热门评论 </n-h6>
          <div class="loading" v-if="!commentData.hotComments[0]">
            <n-skeleton text :repeat="3" />
            <n-skeleton text style="width: 60%" />
          </div>
          <div class="content">
            <Comment
              v-for="item in commentData.hotComments"
              :key="item"
              :commentData="item"
            />
          </div>
        </div>
        <div class="allComments" ref="allCommentsRef">
          <n-h6 prefix="bar">
            全部评论
            <span class="count">{{ commentsCount }} 条</span>
          </n-h6>
          <div class="loading" v-if="!commentData.allComments[0]">
            <n-skeleton text :repeat="3" />
            <n-skeleton text style="width: 60%" />
          </div>
          <div class="content">
            <Comment
              v-for="item in commentData.allComments"
              :key="item"
              :commentData="item"
            />
          </div>
        </div>
        <Pagination
          :pageNumber="pageNumber"
          :totalCount="commentsCount"
          :showSizePicker="false"
          @pageNumberChange="pageNumberChange"
        />
      </div>
    </section>
    <section class="simiVideo">
      <n-h6 prefix="bar"> 相似视频 </n-h6>
      <VideoLists v-if="simiVideo[0]" :listData="simiVideo" />
    </section>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { musicStore } from "@/store";
import { getVideoDetail, getVideoUrl, getSimiVideo } from "@/api/video";
import { getComment } from "@/api/comment";
import { formatNumber, getSongTime } from "@/utils/timeTools.js";
import {
  OndemandVideoFilled,
  ShareFilled,
  MessageOutlined,
} from "@vicons/material";
import VideoLists from "@/components/DataList/VideoLists.vue";
import AllArtists from "@/components/DataList/AllArtists.vue";
import Comment from "@/components/Comment/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

const router = useRouter();
const music = musicStore();

// 视频 id
const videoId = ref(router.currentRoute.value.query.id);

// 相似视频
const simiVideo = ref([]);

// 播放器数据
const videoData = ref(null);
const videoRef = ref(null);
const player = ref(null);
const playerOptions = {
  settings: ["quality", "speed"],
  invertTime: false,
  autoplay: false,
  quality: {
    default: 1080,
    options: [1080, 720, 480, 240],
  },
  i18n: {
    play: "播放",
    pause: "暂停",
    speed: "速度",
    settings: "设置",
    normal: "正常",
    quality: "画质",
    pip: "画中画",
    enterFullscreen: "开启全屏",
    exitFullscreen: "退出全屏",
  },
  tooltips: {
    controls: true,
  },
};

// 评论数据
const commentData = reactive({
  hotComments: [], // 热门评论
  allComments: [], // 全部评论
});
const commentsCount = ref(0);

// 获取视频数据
const getVideoData = (id) => {
  getVideoDetail(id).then((res) => {
    videoData.value = res.data;
    const requests = res.data.brs.map((v) => {
      return getVideoUrl(id, v.br);
    });
    Promise.all(requests)
      .then((results) => {
        const sources = results.map((result) => {
          return {
            src: result.data.url.replace(/^http:/, "https:"),
            type: "video/mp4",
            size: result.data.r,
          };
        });
        player.value.source = {
          type: "video",
          title: videoData.value.name,
          sources,
          poster: videoData.value.cover.replace(/^http:/, "https:"),
        };
      })
      .catch((err) => {
        console.error(err);
        $message.error("视频加载失败，请重试");
      });
    // 请求后回顶
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
  // 获取相似视频
  getSimiVideo(id).then((res) => {
    simiVideo.value = [];
    res.mvs.forEach((v) => {
      simiVideo.value.push({
        id: v.id,
        cover: v.cover,
        name: v.name,
        artist: v.artists,
        playCount: formatNumber(v.playCount),
        duration: getSongTime(v.duration),
      });
    });
  });
};

// 获取评论数据
const getCommentData = (id, offset = 0, type = "mv") => {
  // 获取 before
  let before = null;
  if (commentData.allComments[0] && offset >= 5000) {
    before = commentData.allComments[commentData.allComments.length - 1].time;
  }
  getComment(id, offset, before, type).then((res) => {
    // 写入数据
    if (res.hotComments) {
      commentData.hotComments = res.hotComments;
    } else {
      commentData.hotComments = [];
    }
    commentData.allComments = res.comments;
    commentsCount.value = res.total;
    // 滚动至顶部
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  getCommentData(videoId.value, (val - 1) * 20);
};

onMounted(() => {
  // 隐藏控制条
  music.setPlayBarState(false);
  // 初始化播放器
  player.value = new Plyr(videoRef.value, playerOptions);
  // 获取视频数据
  getVideoData(videoId.value);
  // 获取评论数据
  getCommentData(videoId.value);
  // 播放器事件
  player.value.on("playing", () => {
    console.log("视频开始播放");
    music.setPlayState(false);
  });
});

onBeforeUnmount(() => {
  // 恢复控制条
  music.setPlayBarState(true);
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name == "video") {
      videoId.value = val.query.id;
      getVideoData(val.query.id);
      getCommentData(val.query.id);
    }
  }
);
</script>

<style lang="scss" scoped>
.video {
  --plyr-color-main: #f55e55;
  --plyr-control-radius: 8px;

  display: flex;
  flex-direction: row;
  @media (max-width: 990px) {
    flex-direction: column;
  }
  .mainVideo {
    flex: 1;
    :deep(.plyr) {
      border-radius: 8px;
      overflow: hidden;
    }
    .info {
      margin-top: 20px;
      .title {
        font-size: 24px;
        font-weight: bold;
      }
      .artists {
        font-size: 16px;
        opacity: 0.8;
        margin-top: 2px;
      }
      .desc {
        margin-top: 8px;
      }
      .num {
        margin-top: 8px;
        display: flex;
        flex-direction: row;
        opacity: 0.8;
        span {
          display: flex;
          flex-direction: row;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s;
          &::after {
            content: "·";
            margin: 0 6px;
          }
          &:nth-last-child(1) {
            &::after {
              display: none;
            }
          }
          &:hover {
            color: $mainColor;
          }
          .n-icon {
            margin-right: 6px;
            transform: translateY(-1px);
          }
        }
      }
    }
    .comment {
      margin-top: 20px;
      .hotComments,
      .allComments {
        margin-top: 40px;
        .count {
          font-size: 13px;
          margin-left: 4px;
          opacity: 0.6;
        }
      }
    }
  }
  .simiVideo {
    width: 20vw;
    min-width: 200px;
    max-width: 400px;
    margin-left: 30px;
    @media (max-width: 990px) {
      max-width: 100%;
      width: 100%;
      margin-left: 0;
      margin-top: 40px;
    }
    .videolists {
      :deep(.n-grid) {
        @media (min-width: 990px) {
          grid-template-columns: repeat(1, minmax(0px, 1fr)) !important;
        }
      }
    }
  }
}
</style>
