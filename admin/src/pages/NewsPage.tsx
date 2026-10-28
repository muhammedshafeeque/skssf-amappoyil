import { Box, Button, Card, CardActions, CardContent, CardMedia, Chip, IconButton, ImageList, ImageListItem, ImageListItemBar, Stack, Typography } from '@mui/material';
import { Add, Close, Image as ImageIcon, PushPin } from '@mui/icons-material';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { postSchema } from '../shared';
import type { Post } from '../shared';
import { CheckEl, TextEl } from '../components/form';
import { FormDialog, PageHeader, StatusChip, useToast } from '../components/ui';
import { errorMessage, stamp, useCollection } from '../lib/data';
import type { WithId } from '../lib/data';
import { auth, db } from '../lib/firebase';
import { uploadImage } from '../lib/files';
import { formatTs } from '../lib/labels';
import { useZodForm } from '../lib/useForm';

function PostDialog({ open, onClose, post }: { open: boolean; onClose: () => void; post: WithId<Post> | null }) {
  const toast = useToast();
  const { control, reset, submit, saving, error, setError, watch, setValue } = useZodForm(postSchema, {} as never);
  const [postId, setPostId] = useState('');
  const [uploading, setUploading] = useState(false);
  const images = (watch('images') as string[] | undefined) ?? [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPostId(post?.id ?? doc(collection(db, 'posts')).id);
    reset(post ? ({ ...post } as never) : ({ title: '', body: '', images: [], status: 'draft', pinned: false, notify: true } as never));
  }, [open, post, reset, setError]);

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 10 - images.length)) {
        urls.push(await uploadImage(`posts/${postId}/${Date.now()}-${f.name.replace(/[^\w.]+/g, '_')}.jpg`, f));
      }
      setValue('images', [...images, ...urls]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const save = (publish: boolean) =>
    submit(async (v) => {
      const status = publish ? 'published' : v.status;
      const wasPublished = post?.status === 'published';
      const data = {
        ...v,
        status,
        publishedAt: status === 'published' ? (wasPublished ? post!.publishedAt : serverTimestamp()) : null,
        ...stamp(!post),
      };
      if (post) await updateDoc(doc(db, 'posts', postId), data);
      else await setDoc(doc(db, 'posts', postId), { ...data, authorId: auth.currentUser!.uid, notifiedAt: null });
      toast(status === 'published' ? (v.notify && !post?.notifiedAt ? 'Published — members will get a notification' : 'Published') : 'Saved as draft');
      onClose();
    });

  return (
    <FormDialog open={open} title={post ? 'Edit post' : 'New post'} onClose={onClose} onSubmit={save(false)} submitting={saving || uploading} error={error} submitLabel={post?.status === 'published' ? 'Save' : 'Save draft'} maxWidth="md">
      <TextEl control={control} name="title" label="Title" required />
      <TextEl control={control} name="body" label="Text" required multiline minRows={6} />
      <Box>
        <Button component="label" startIcon={<ImageIcon />} disabled={uploading || images.length >= 10}>
          {uploading ? 'Uploading…' : 'Add images'}
          <input hidden multiple type="file" accept="image/*" onChange={(e) => addImages(e.target.files)} />
        </Button>
        {images.length > 0 && (
          <ImageList cols={4} rowHeight={110} sx={{ mt: 1 }}>
            {images.map((url) => (
              <ImageListItem key={url}>
                <img src={url} alt="" style={{ objectFit: 'cover', height: 110 }} />
                <ImageListItemBar
                  position="top"
                  sx={{ background: 'transparent' }}
                  actionIcon={
                    <IconButton size="small" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,.4)' }} onClick={() => setValue('images', images.filter((x) => x !== url))} aria-label="Remove image">
                      <Close fontSize="small" />
                    </IconButton>
                  }
                />
              </ImageListItem>
            ))}
          </ImageList>
        )}
      </Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap' }}>
        <CheckEl control={control} name="pinned" label="Pin to top" />
        <CheckEl control={control} name="notify" label="Send push notification when published" />
      </Stack>
      {post?.status !== 'published' && (
        <Button variant="contained" color="secondary" onClick={() => save(true)()} disabled={saving || uploading}>
          Publish now
        </Button>
      )}
    </FormDialog>
  );
}

export function NewsPage() {
  const toast = useToast();
  const { data } = useCollection<Post>('posts');
  const [editing, setEditing] = useState<WithId<Post> | null | undefined>(undefined);
  const posts = useMemo(
    () => [...data].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishedAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0) - (a.publishedAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0)),
    [data],
  );

  const unpublish = async (p: WithId<Post>) => updateDoc(doc(db, 'posts', p.id), { status: 'draft', ...stamp() }).catch((e) => toast(errorMessage(e), 'error'));
  const remove = async (p: WithId<Post>) => {
    if (window.confirm(`Delete "${p.title}"?`)) await deleteDoc(doc(db, 'posts', p.id));
  };

  return (
    <>
      <PageHeader title="News" subtitle="Posts appear in the member app feed once published" actions={<Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)}>New post</Button>} />
      <Stack spacing={2}>
        {posts.length === 0 && <Typography color="text.secondary">No posts yet.</Typography>}
        {posts.map((p) => (
          <Card key={p.id} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
            {p.images[0] && <CardMedia component="img" image={p.images[0]} alt="" sx={{ width: { sm: 200 }, height: { xs: 160, sm: 'auto' }, objectFit: 'cover' }} />}
            <Box sx={{ flex: 1 }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                  <StatusChip value={p.status} />
                  {p.pinned && <Chip size="small" icon={<PushPin />} label="Pinned" />}
                  {p.images.length > 1 && <Chip size="small" label={`${p.images.length} images`} />}
                  {p.notifiedAt && <Chip size="small" variant="outlined" label="Notified" />}
                  <Typography variant="caption" color="text.secondary">{formatTs(p.publishedAt ?? p.updatedAt)}</Typography>
                </Stack>
                <Typography variant="h6">{p.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.body}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="small" onClick={() => updateDoc(doc(db, 'posts', p.id), { pinned: !p.pinned, ...stamp() })}>{p.pinned ? 'Unpin' : 'Pin'}</Button>
                {p.status === 'published' && <Button size="small" onClick={() => unpublish(p)}>Unpublish</Button>}
                <Button size="small" color="error" onClick={() => remove(p)}>Delete</Button>
              </CardActions>
            </Box>
          </Card>
        ))}
      </Stack>
      <PostDialog open={editing !== undefined} post={editing ?? null} onClose={() => setEditing(undefined)} />
    </>
  );
}
