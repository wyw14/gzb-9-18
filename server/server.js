const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { readItems, writeItems, readExchanges, writeExchanges } = require('./storage');

const app = express();
const PORT = 3450;
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const PLACEHOLDER_IMAGE = `data:image/svg+xml;base64,` + Buffer.from(`
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <g fill="white" opacity="0.8" font-family="Arial" text-anchor="middle">
    <text x="300" y="260" font-size="120" font-weight="bold">?</text>
    <text x="300" y="340" font-size="48">MYSTERY</text>
    <text x="300" y="400" font-size="28" opacity="0.7">神秘盲盒</text>
  </g>
</svg>
`).toString('base64');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({ storage });

function getItemImages(item) {
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    return item.images;
  }
  if (item.image) {
    return [item.image];
  }
  return [];
}

function getItemBlurredImages(item) {
  if (item.blurredImages && Array.isArray(item.blurredImages) && item.blurredImages.length > 0) {
    return item.blurredImages;
  }
  if (item.blurredImage) {
    return [item.blurredImage];
  }
  return [];
}

function getPublicImage(item) {
  const blurredImages = getItemBlurredImages(item);
  if (blurredImages.length > 0) {
    const firstBlurred = blurredImages[0];
    const blurredFilename = path.basename(firstBlurred);
    const blurredPath = path.join(UPLOADS_DIR, blurredFilename);
    if (fs.existsSync(blurredPath)) {
      return firstBlurred;
    }
  }
  return PLACEHOLDER_IMAGE;
}

function getPublicImages(item) {
  const blurredImages = getItemBlurredImages(item);
  const validBlurred = blurredImages.filter(img => {
    const blurredFilename = path.basename(img);
    const blurredPath = path.join(UPLOADS_DIR, blurredFilename);
    return fs.existsSync(blurredPath);
  });
  if (validBlurred.length > 0) {
    return validBlurred;
  }
  return [PLACEHOLDER_IMAGE];
}

async function generateBlurredImage(originalPath) {
  const parsed = path.parse(originalPath);
  const blurredFilename = 'blur_' + parsed.name + '.jpg';
  const blurredPath = path.join(UPLOADS_DIR, blurredFilename);

  await sharp(originalPath)
    .blur(20)
    .modulate({ brightness: 0.8 })
    .jpeg({ quality: 60 })
    .toFile(blurredPath);

  if (!fs.existsSync(blurredPath)) {
    throw new Error('模糊图文件未生成');
  }

  return '/uploads/' + blurredFilename;
}

async function generateBlurredImages(originalPaths) {
  const blurredPaths = [];
  for (const originalPath of originalPaths) {
    try {
      const blurredPath = await generateBlurredImage(originalPath);
      blurredPaths.push(blurredPath);
    } catch (err) {
      console.error('生成模糊图片失败:', err);
    }
  }
  return blurredPaths;
}

app.get('/api/items', (req, res) => {
  const { userId } = req.query;
  let items = readItems();

  if (userId) {
    items = items.filter(item => item.ownerId !== userId);
  }

  const publicItems = items.map(item => ({
    id: item.id,
    category: item.category,
    mysteryTags: item.mysteryTags,
    image: getPublicImage(item),
    images: getPublicImages(item),
    createdAt: item.createdAt,
    status: item.status
  }));

  res.json(publicItems);
});

app.get('/api/items/my', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }

  const items = readItems();
  const myItems = items.filter(item => item.ownerId === userId).map(item => ({
    ...item,
    images: getItemImages(item),
    blurredImages: getItemBlurredImages(item)
  }));
  res.json(myItems);
});

app.get('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  const items = readItems();
  const item = items.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const itemWithImages = {
    ...item,
    images: getItemImages(item),
    blurredImages: getItemBlurredImages(item)
  };

  const exchanges = readExchanges();
  const relatedExchange = exchanges.find(e =>
    (e.item1Id === id || e.item2Id === id) && e.status === 'completed'
  );

  if (relatedExchange) {
    const otherItemId = relatedExchange.item1Id === id ? relatedExchange.item2Id : relatedExchange.item1Id;
    const otherItem = items.find(i => i.id === otherItemId);
    const otherItemWithImages = otherItem ? {
      ...otherItem,
      images: getItemImages(otherItem),
      blurredImages: getItemBlurredImages(otherItem)
    } : null;

    const isOwner = item.ownerId === userId;
    const isOtherOwner = otherItem && otherItem.ownerId === userId;

    if (isOwner || isOtherOwner) {
      return res.json({
        ...itemWithImages,
        revealInfo: true,
        exchange: {
          id: relatedExchange.id,
          otherItem: otherItemWithImages,
          contact: isOwner ? relatedExchange.item2Contact : relatedExchange.item1Contact,
          status: relatedExchange.status
        }
      });
    }
  }

  const isOwner = item.ownerId === userId;

  if (isOwner) {
    const pendingExchange = exchanges.find(e =>
      (e.item1Id === id || e.item2Id === id) && e.status === 'pending'
    );
    if (pendingExchange) {
      const otherItemId = pendingExchange.item1Id === id ? pendingExchange.item2Id : pendingExchange.item1Id;
      const otherItem = items.find(i => i.id === otherItemId);
      const otherItemWithImages = otherItem ? {
        ...otherItem,
        images: getItemImages(otherItem),
        blurredImages: getItemBlurredImages(otherItem)
      } : null;
      return res.json({
        ...itemWithImages,
        revealInfo: true,
        exchange: {
          id: pendingExchange.id,
          otherItem: otherItemWithImages,
          status: pendingExchange.status
        }
      });
    }
    return res.json({ ...itemWithImages, revealInfo: true });
  }

  res.json({
    id: item.id,
    category: item.category,
    mysteryTags: item.mysteryTags,
    image: getPublicImage(item),
    images: getPublicImages(item),
    createdAt: item.createdAt,
    status: item.status,
    revealInfo: false
  });
});

app.post('/api/items', upload.array('images', 20), async (req, res) => {
  const { category, mysteryTags, realName, description, contact, ownerId, ownerName } = req.body;

  if (!category || !mysteryTags || !realName || !contact || !ownerId) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
    }
    return res.status(400).json({ error: '缺少必要字段' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请上传至少一张物品图片' });
  }

  const originalPaths = req.files.map(file => file.path);
  const imageUrls = req.files.map(file => '/uploads/' + file.filename);

  let blurredImagePaths;
  try {
    blurredImagePaths = await generateBlurredImages(originalPaths);
  } catch (err) {
    console.error('生成模糊图片失败:', err);
    originalPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
    return res.status(500).json({ error: '图片处理失败，请换一张图片重试' });
  }

  if (blurredImagePaths.length === 0) {
    originalPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch (e) {}
    });
    return res.status(500).json({ error: '图片处理失败，请换一张图片重试' });
  }

  const items = readItems();
  const newItem = {
    id: uuidv4(),
    category,
    mysteryTags: JSON.parse(mysteryTags),
    realName,
    description: description || '',
    contact,
    image: imageUrls[0],
    images: imageUrls,
    blurredImage: blurredImagePaths[0],
    blurredImages: blurredImagePaths,
    ownerId,
    ownerName: ownerName || '匿名用户',
    status: 'available',
    createdAt: new Date().toISOString()
  };

  items.push(newItem);
  writeItems(items);

  res.status(201).json(newItem);
});

app.post('/api/exchanges', (req, res) => {
  const { myItemId, targetItemId } = req.body;

  if (!myItemId || !targetItemId) {
    return res.status(400).json({ error: '缺少物品ID' });
  }

  if (myItemId === targetItemId) {
    return res.status(400).json({ error: '不能与自己交换' });
  }

  const items = readItems();
  const myItem = items.find(i => i.id === myItemId);
  const targetItem = items.find(i => i.id === targetItemId);

  if (!myItem || !targetItem) {
    return res.status(404).json({ error: '物品不存在' });
  }

  if (myItem.status !== 'available' || targetItem.status !== 'available') {
    return res.status(400).json({ error: '物品状态不允许交换' });
  }

  const exchanges = readExchanges();
  const existingExchange = exchanges.find(e =>
    (e.item1Id === myItemId || e.item2Id === myItemId ||
     e.item1Id === targetItemId || e.item2Id === targetItemId) &&
    (e.status === 'pending' || e.status === 'completed')
  );

  if (existingExchange) {
    return res.status(400).json({ error: '该物品已在交换流程中' });
  }

  const newExchange = {
    id: uuidv4(),
    item1Id: myItemId,
    item2Id: targetItemId,
    item1Contact: myItem.contact,
    item2Contact: targetItem.contact,
    item1Owner: myItem.ownerId,
    item2Owner: targetItem.ownerId,
    status: 'completed',
    createdAt: new Date().toISOString()
  };

  exchanges.push(newExchange);
  writeExchanges(exchanges);

  const updateIndex1 = items.findIndex(i => i.id === myItemId);
  const updateIndex2 = items.findIndex(i => i.id === targetItemId);
  if (updateIndex1 !== -1) items[updateIndex1].status = 'exchanged';
  if (updateIndex2 !== -1) items[updateIndex2].status = 'exchanged';
  writeItems(items);

  const targetItemWithImages = {
    ...targetItem,
    images: getItemImages(targetItem),
    blurredImages: getItemBlurredImages(targetItem),
    revealInfo: true
  };

  res.status(201).json({
    exchange: newExchange,
    targetItem: targetItemWithImages
  });
});

app.get('/api/exchanges/my', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }

  const exchanges = readExchanges();
  const items = readItems();

  const myExchanges = exchanges
    .filter(e => e.item1Owner === userId || e.item2Owner === userId)
    .map(e => {
      const item1 = items.find(i => i.id === e.item1Id);
      const item2 = items.find(i => i.id === e.item2Id);
      const isItem1Owner = e.item1Owner === userId;
      const myItem = isItem1Owner ? item1 : item2;
      const otherItem = isItem1Owner ? item2 : item1;

      return {
        ...e,
        myItem: myItem ? {
          ...myItem,
          images: getItemImages(myItem),
          blurredImages: getItemBlurredImages(myItem)
        } : null,
        otherItem: otherItem ? {
          ...otherItem,
          images: getItemImages(otherItem),
          blurredImages: getItemBlurredImages(otherItem)
        } : null,
        otherContact: isItem1Owner ? e.item2Contact : e.item1Contact
      };
    });

  res.json(myExchanges);
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  const items = readItems();
  const itemIndex = items.findIndex(i => i.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: '物品不存在' });
  }

  const item = items[itemIndex];

  if (item.ownerId !== userId) {
    return res.status(403).json({ error: '无权限删除' });
  }

  if (item.status !== 'available') {
    return res.status(400).json({ error: '物品正在交换中，无法删除' });
  }

  const images = getItemImages(item);
  const blurredImages = getItemBlurredImages(item);

  images.forEach(img => {
    const filePath = path.join(UPLOADS_DIR, path.basename(img));
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { console.error('删除原图失败:', e); }
  });

  blurredImages.forEach(img => {
    const filePath = path.join(UPLOADS_DIR, path.basename(img));
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { console.error('删除模糊图失败:', e); }
  });

  items.splice(itemIndex, 1);
  writeItems(items);

  res.json({ message: '删除成功' });
});

app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.redirect(PLACEHOLDER_IMAGE);
  }

  if (filename.startsWith('blur_')) {
    return res.sendFile(filePath);
  }

  const items = readItems();
  let targetItem = null;
  let isBlurred = false;

  for (const item of items) {
    const images = getItemImages(item);
    const blurredImages = getItemBlurredImages(item);

    if (images.some(img => path.basename(img) === filename)) {
      targetItem = item;
      break;
    }
    if (blurredImages.some(img => path.basename(img) === filename)) {
      targetItem = item;
      isBlurred = true;
      break;
    }
  }

  if (!targetItem) {
    return res.redirect(PLACEHOLDER_IMAGE);
  }

  if (isBlurred) {
    return res.sendFile(filePath);
  }

  const { userId } = req.query;

  if (targetItem.ownerId === userId) {
    return res.sendFile(filePath);
  }

  const exchanges = readExchanges();
  const relatedExchange = exchanges.find(e =>
    (e.item1Id === targetItem.id || e.item2Id === targetItem.id) && e.status === 'completed'
  );

  if (relatedExchange) {
    const isItem1Owner = relatedExchange.item1Owner === userId;
    const isItem2Owner = relatedExchange.item2Owner === userId;
    if (isItem1Owner || isItem2Owner) {
      return res.sendFile(filePath);
    }
  }

  const blurredImages = getItemBlurredImages(targetItem);
  if (blurredImages.length > 0) {
    const firstBlurred = blurredImages[0];
    const blurredFilename = path.basename(firstBlurred);
    const blurredPath = path.join(UPLOADS_DIR, blurredFilename);
    if (fs.existsSync(blurredPath)) {
      return res.sendFile(blurredPath);
    }
  }

  try {
    const blurredUrl = await generateBlurredImage(filePath);
    const allItems = readItems();
    const idx = allItems.findIndex(i => i.id === targetItem.id);
    if (idx !== -1) {
      const currentBlurred = getItemBlurredImages(allItems[idx]);
      currentBlurred.push(blurredUrl);
      allItems[idx].blurredImages = currentBlurred;
      allItems[idx].blurredImage = currentBlurred[0];
      writeItems(allItems);
    }
    const blurredFilename = path.basename(blurredUrl);
    const blurredPath = path.join(UPLOADS_DIR, blurredFilename);
    return res.sendFile(blurredPath);
  } catch (err) {
    console.error('动态生成模糊图失败:', err);
    return res.redirect(PLACEHOLDER_IMAGE);
  }
});

app.listen(PORT, () => {
  console.log(`盲盒交换平台后端服务已启动: http://localhost:${PORT}`);
});
