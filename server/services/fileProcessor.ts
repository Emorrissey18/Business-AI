import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, TXT, and DOCX files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    switch (mimeType) {
      case 'text/plain':
        return await extractTextFromTxt(filePath);
      case 'application/pdf':
        return await extractTextFromPdf(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return await extractTextFromDocx(filePath);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromTxt(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString('utf-8');
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  // For now, return a placeholder since PDF parsing requires additional dependencies
  // In a real implementation, you would use libraries like pdf-parse or pdf2pic
  return "PDF content extraction not yet implemented. This is a placeholder for PDF text content.";
}

async function extractTextFromDocx(filePath: string): Promise<string> {
  // For now, return a placeholder since DOCX parsing requires additional dependencies
  // In a real implementation, you would use libraries like mammoth or docx-parser
  return "DOCX content extraction not yet implemented. This is a placeholder for DOCX text content.";
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    console.error('Failed to cleanup file:', error);
  }
}
