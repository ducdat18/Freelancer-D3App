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
  Grid
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
                    opacity: 1
                  }
                },
                borderRadius: 2,
                overflow: 'hidden'
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
                title={item.title}
                subtitle={item.description?.substring(0, 50) + (item.description && item.description.length > 50 ? '...' : '')}
                sx={{
                  opacity: 0.9,
                  transition: 'opacity 0.3s'
                }}
                actionIcon={
                  editable && onItemRemove ? (
                    <IconButton
                      sx={{ color: 'white' }}
                      onClick={(e) => handleDelete(item.id, e)}
                    >
                      <Delete />
                    </IconButton>
                  ) : undefined
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No portfolio items yet
          </Typography>
          {editable && (
            <Typography variant="body2" color="text.secondary">
              Add your best work to showcase your skills
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
      >
        {selectedItem && (
          <>
            <DialogTitle>
              {selectedItem.title}
              <IconButton
                onClick={handleCloseView}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <IPFSImage
                  hash={selectedItem.imageUri}
                  alt={selectedItem.title}
                  width="100%"
                  height={400}
                  objectFit="contain"
                  borderRadius={8}
                />
              </Box>
              {selectedItem.description && (
                <Typography variant="body1" paragraph>
                  {selectedItem.description}
                </Typography>
              )}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedItem.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Stack>
                </Box>
              )}
              {selectedItem.link && (
                <Button
                  variant="outlined"
                  startIcon={<OpenInNew />}
                  href={selectedItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Project
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
      >
        <DialogTitle>Add Portfolio Item</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Image Upload */}
            <Box>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                disabled={uploading}
              >
                {newItem.imageUri ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              {newItem.imageUri && (
                <Box sx={{ mt: 2 }}>
                  <IPFSImage
                    hash={newItem.imageUri}
                    alt="Preview"
                    width="100%"
                    height={200}
                    objectFit="contain"
                    borderRadius={8}
                  />
                </Box>
              )}
            </Box>

            {/* Title */}
            <TextField
              label="Title"
              value={newItem.title}
              onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
            />

            {/* Description */}
            <TextField
              label="Description"
              value={newItem.description}
              onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />

            {/* Link */}
            <TextField
              label="Project Link (optional)"
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
                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {newItem.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onDelete={() => handleRemoveTag(tag)}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.title || !newItem.imageUri || uploading}
          >
            Add Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
