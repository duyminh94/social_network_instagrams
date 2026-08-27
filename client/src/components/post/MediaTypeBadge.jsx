// components/post/MediaTypeBadge.jsx
// Icon nhỏ ở góc thumbnail:
//   - nhiều media: hiện icon carousel
//   - video đơn: hiện icon play
//   - ảnh đơn: không hiện gì

export default function MediaTypeBadge({ post }) {
  var mediaList = post?.media || []
  var firstMedia = mediaList[0]

  // Ưu tiên carousel trước video: nếu bài có nhiều ảnh/video thì icon chồng ảnh dễ hiểu hơn.
  var isCarousel = mediaList.length > 1
  var isVideo = post?.mediaType === 'video' || firstMedia?.mediaType === 'video'

  if (!isCarousel && !isVideo) {
    return null
  }

  return (
    <span style={{
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 6,
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      filter: 'drop-shadow(0 2px 5px rgba(0,0,0,.45))',
      pointerEvents: 'none',
      zIndex: 2,
    }}>
      {isCarousel ? <CarouselIcon /> : <PlayIcon />}
    </span>
  )
}

function PlayIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5z" />
    </svg>
  )
}

function CarouselIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="4" width="13" height="13" rx="2" fill="currentColor" />
      <rect x="4" y="7" width="13" height="13" rx="2" fill="currentColor" opacity=".9" />
    </svg>
  )
}
