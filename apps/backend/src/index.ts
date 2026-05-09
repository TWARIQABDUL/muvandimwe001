import express from 'express';
import cors from 'cors';
import { ApiResponse, User } from '@my-app/shared';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  const response: ApiResponse<string> = {
    success: true,
    data: 'Backend is healthy and running with TypeScript!'
  };
  res.json(response);
});

app.get('/api/users', (req, res) => {
  const users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
  ];
  const response: ApiResponse<User[]> = {
    success: true,
    data: users
  };
  res.json(response);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
