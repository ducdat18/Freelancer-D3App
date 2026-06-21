import React, { useState } from 'react';
import {
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Typography,
  Chip,
  Stack,
  TextField,
  Grid,
  useTheme
} from '@mui/material';
import {
  Delete,
  Edit,
  Close,
  Add,
  Link as LinkIcon,
  OpenInNew
} from '@mui/icons-material';
import { PortfolioItem } from '../../hooks/useProfileData';
import IPFSImage from '../common/IPFSImage';
import { useIPFS } from '../../hooks/useIPFS';

interface PortfolioGalleryProps {
  items: PortfolioItem[];
  editable?: boolean;
  onItemAdd?: (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => Promise<void>;
  onItemRemove?: (id: string) => Promise<void>;
  columns?: number;
}

export default function PortfolioGallery({
  items,
  editable = false,
  onItemAdd,
  onItemRemove,
  columns = 3
}: PortfolioGalleryProps) {
  const { uploadFile } = useIPFS();
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // New item form state
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    link: '',
    tags: [] as string[],
    imageUri: ''
  });

  const handleViewItem = (item: PortfolioItem) => {
    setSelectedItem(item);
  };

  const handleCloseView = () => {
    setSelectedItem(null);
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onItemRemove && window.confirm('Are you sure you want to remove this portfolio item?')) {
      await onItemRemove(id);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      const ipfsHash = await uploadFile(file);
      if (ipfsHash) {
        setNewItem(prev => ({ ...prev, imageUri: ipfsHash }));
      } else {
        throw new Error('Failed to upload file to IPFS');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title || !newItem.imageUri) {
      alert('Please provide a title and image');
      return;
    }

    if (onItemAdd) {
      try {
        await onItemAdd(newItem);
        setNewItem({ title: '', description: '', link: '', tags: [], imageUri: '' });
        setAddDialogOpen(false);
      } catch (err) {
        console.error('Error adding portfolio item:', err);
        alert('Failed to add portfolio item');
      }
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !newItem.tags.includes(tag)) {
      setNewItem(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewItem(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Box>
      {/* Add Button */}
      {editable && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 1.5, px: 3 }}
          >
            Add Portfolio Item
          </Button>
        </Box>
      )}

      {/* Gallery */}
      {items.length > 0 ? (
        <ImageList cols={columns} gap={16}>
          {items.map((item) => (
            <ImageListItem
              key={item.id}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  '& .MuiImageListItemBar-root': {
                    opacity: 1,
                    background: 'rgba(0,0,0,0.85)',
                  },
                  transform: 'scale(1.02)',
                },
                borderRadius: 2,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                border: 1,
                borderColor: 'divider',
              }}
              onClick={() => handleViewItem(item)}
            >
              <IPFSImage
                hash={item.imageUri}
                alt={item.title}
                width="100%"
                height={200}
                objectFit="cover"
              />
              <ImageListItemBar
                title={<Typography fontWeight={700} sx={{ fontSize: '0.9rem' }}>{item.title}</Typography>}
                subtitle={item.description?.substring(0, 50) + (item.description && item.description.length > 50 ? '...' : '')}
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.3s',
                  background: 'rgba(0,0,0,0.7)',
                }}
                actionIcon={
                  editable && onItemRemove ? (
                    <IconButton
                      sx={{ color: theme.palette.error.main }}
                      onClick={(e) => handleDelete(item.id, e)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  ) : undefined
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8, border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom fontWeight={600}>
            No portfolio items yet
          </Typography>
          {editable && (
            <Typography variant="body2" color="text.secondary">
              Showcase your best work to land more jobs
            </Typography>
          )}
        </Box>
      )}

      {/* View Dialog */}
      <Dialog
        open={!!selectedItem}
        onClose={handleCloseView}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { backgroundImage: 'none' } }}
      >
        {selectedItem && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 6 }}>
              <Typography variant="h6" fontWeight={700}>{selectedItem.title}</Typography>
              <IconButton
                onClick={handleCloseView}
                sx={{ position: 'absolute', right: 8, top: 8 }}
                size="small"
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers={!isDark}>
              <Box sx={{ mb: 3, border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <IPFSImage
                  hash={selectedItem.imageUri}
                  alt={selectedItem.title}
                  width="100%"
                  height={400}
                  objectFit="contain"
                  borderRadius={0}
                />
              </Box>
              {selectedItem.description && (
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: 'text.primary' }}>
                  {selectedItem.description}
                </Typography>
              )}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedItem.tags.map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
              {selectedItem.link && (
                <Button
                  variant="contained"
                  startIcon={<OpenInNew />}
                  href={selectedItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 700 }}
                >
                  View Live Project
                </Button>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Add Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { backgroundImage: 'none' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Portfolio Item</DialogTitle>
        <DialogContent dividers={!isDark}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Image Upload */}
            <Box>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                disabled={uploading}
                sx={{ borderStyle: 'dashed', py: 2, fontWeight: 700 }}
              >
                {newItem.imageUri ? 'Change Image' : 'Upload Project Image'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              {newItem.imageUri && (
                <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                  <IPFSImage
                    hash={newItem.imageUri}
                    alt="Preview"
                    width="100%"
                    height={200}
                    objectFit="contain"
                    borderRadius={0}
                  />
                </Box>
              )}
            </Box>

            {/* Title */}
            <TextField
              label="Project Title"
              value={newItem.title}
              onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
              variant="outlined"
            />

            {/* Description */}
            <TextField
              label="Project Description"
              value={newItem.description}
              onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />

            {/* Link */}
            <TextField
              label="Project URL (optional)"
              value={newItem.link}
              onChange={(e) => setNewItem(prev => ({ ...prev, link: e.target.value }))}
              placeholder="https://..."
              fullWidth
            />

            {/* Tags */}
            <Box>
              <TextField
                label="Add Tags (press Enter)"
                placeholder="e.g., React, Design, Web3"
                fullWidth
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    handleAddTag(target.value);
                    target.value = '';
                  }
                }}
              />
              {newItem.tags.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {newItem.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onDelete={() => handleRemoveTag(tag)}
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.title || !newItem.imageUri || uploading}
            sx={{ fontWeight: 700, px: 4 }}
          >
            {uploading ? 'Uploading...' : 'Save Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
