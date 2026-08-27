// pages/admin/AdminContentList.jsx
// Danh sách bài viết / reel / story cho admin — tìm kiếm và phân trang
//
// contentType lấy từ URL: 'post' | 'reel' | 'story'

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import Pagination from '@mui/material/Pagination'
import IconButton from '@mui/material/IconButton'
import api from '../../services/api'
import Avatar from '../../components/common/Avatar'
import Icon from '../../components/common/Icon'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../utils/formatTime'
import { goAdmin } from '../../utils/adminNavigation'
import * as s from './adminStyles'

export default function AdminContentList() {
  var { contentType } = useParams()
  var navigate = useNavigate()
  var { t } = useLanguage()
  var [page, setPage] = useState(1)
  var [search, setSearch] = useState('')
  var labels = {
    post: t.admin.content.posts,
    reel: t.admin.content.reels,
    story: t.admin.content.stories,
  }

  var contentQuery = useQuery({
    queryKey: ['adminContent', contentType, page, search],
    queryFn: function () {
      return api.get('/admin/content/' + contentType, {
        params: { page: page, limit: 20, q: search || undefined },
      }).then(function (response) { return response.data })
    },
    enabled: !!labels[contentType],
  })

  var items = contentQuery.data?.items || []
  var totalPages = contentQuery.data?.totalPages || 1

  function getPreview(content) {
    var media = content.media?.[0]
    return media?.thumbnailUrl || media?.url || ''
  }

  return (
    <Box sx={s.page}>
      <Box sx={s.pageHeader}>
        <Box>
          <Typography component="h2" sx={s.pageTitle}>
            {labels[contentType] || t.admin.content.title}
          </Typography>
          <Typography sx={s.pageSubtitle}>{t.admin.content.listDescription}</Typography>
        </Box>
      </Box>

      <TextField
        type="search"
        size="small"
        fullWidth
        sx={s.searchInput}
        placeholder={t.admin.content.searchPlaceholder}
        value={search}
        onChange={function (event) { setSearch(event.target.value); setPage(1) }}
      />

      {contentQuery.isLoading ? (
        <Spinner fullPage />
      ) : contentQuery.isError ? (
        <Box sx={s.empty}>{t.admin.content.loadFailed}</Box>
      ) : items.length === 0 ? (
        <Box sx={s.empty}>{t.admin.content.noContent}</Box>
      ) : (
        <Box sx={s.tableWrap}>
          <Table sx={s.table}>
            <TableHead>
              <TableRow>
                <TableCell>{t.admin.content.preview}</TableCell>
                <TableCell>{t.admin.content.author}</TableCell>
                <TableCell>{t.admin.content.content}</TableCell>
                <TableCell>{t.admin.content.publishedAt}</TableCell>
                <TableCell>{t.admin.content.status}</TableCell>
                <TableCell>{t.admin.content.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(function (content) {
                var preview = getPreview(content)
                var firstMedia = content.media?.[0]
                // Video chưa có ảnh thu nhỏ thì phát khung đầu bằng thẻ video
                var isRawVideo = firstMedia?.mediaType === 'video' && !firstMedia?.thumbnailUrl

                return (
                  <TableRow key={content._id}>
                    <TableCell>
                      <Box sx={s.preview}>
                        {preview
                          ? (isRawVideo
                              ? <video src={preview} muted preload="metadata" />
                              : <img src={preview} alt="" />)
                          : <Icon name="image" size={22} />}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box
                        component="button"
                        type="button"
                        sx={s.authorButton}
                        disabled={!content.author?._id}
                        onClick={function () { goAdmin(navigate, '/admin/users/' + content.author._id) }}
                      >
                        <Avatar src={content.author?.avatarUrl} username={content.author?.username} size="sm" />
                        <Box component="span">
                          <strong>{content.author?.fullName || content.author?.username || t.admin.content.unknown}</strong>
                          <span>@{content.author?.username || t.admin.content.unknown}</span>
                          <small>{content.author?.email}</small>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography sx={s.caption}>
                        {content.caption || t.admin.content.noCaption}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(content.createdAt)}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={content.isDeleted ? 'default' : 'success'}
                        label={content.isDeleted ? t.admin.content.hidden : t.admin.content.visible}
                      />
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        title={t.admin.content.viewDetail}
                        aria-label={t.admin.content.viewDetail}
                        onClick={function () { goAdmin(navigate, '/admin/content/' + contentType + '/' + content._id) }}
                      >
                        <Icon name="eye" size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={s.paginationRow}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={function (_, value) { setPage(value) }}
            color="primary"
          />
        </Box>
      )}
    </Box>
  )
}
