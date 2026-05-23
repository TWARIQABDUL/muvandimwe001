import axios from 'axios';
(async () => {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', { email: 'manager@demo.com', password: 'demo123' });
    const token = res.data.token;
    const servicesRes = await axios.get('http://localhost:3000/api/services', { headers: { Authorization: `Bearer ${token}` } });
    console.log("SERVICES:", JSON.stringify(servicesRes.data, null, 2));
  } catch (err) { console.error(err.message); }
})();
