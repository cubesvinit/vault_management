# Vault Management API - File Upload Documentation

## Admin User Creation with Photo Upload

### Endpoint: `POST /admin/add-user`

This endpoint allows admins to create new users with the requirement to upload 3 photos:
- Aadhar Front Image
- Aadhar Back Image
- Signature Image

### Authentication
- Requires admin authentication
- Include `Authorization: Bearer <admin_token>` header

### Request Format
Use `multipart/form-data` for file uploads.

#### Required Fields:
- `phone_number` (string): User's phone number (required, unique)
- `password` (string): Password set by admin (min 6 characters)

#### Optional Fields:
- `email` (string): User's email address
- `first_name` (string): User's first name
- `last_name` (string): User's last name
- `aadhar_number` (string): 12-digit Aadhar number
- `full_address` (string): User's full address
- `latitude` (number): Location latitude
- `longitude` (number): Location longitude
- `iso_code` (string): Country ISO code
- `country_code` (string): Country code

#### Required Files:
- `aadhar_front_image` (file): Front side of Aadhar card (image only, max 5MB)
- `aadhar_back_image` (file): Back side of Aadhar card (image only, max 5MB)
- `signature_image` (file): User's signature (image only, max 5MB)

### File Upload Specifications:
- **Allowed formats**: Images only (jpg, jpeg, png, gif, etc.)
- **Maximum file size**: 5MB per file
- **Storage**: Files are stored in `uploads/` directory
- **File naming**: Unique filename with timestamp to prevent conflicts

### Example cURL Request:
```bash
curl -X POST http://localhost:4000/admin/add-user \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "phone_number=+1234567890" \
  -F "password=securepassword123" \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "aadhar_front_image=@/path/to/aadhar_front.jpg" \
  -F "aadhar_back_image=@/path/to/aadhar_back.jpg" \
  -F "signature_image=@/path/to/signature.png"
```

### Response:
```json
{
  "success": true,
  "message": "User created successfully. OTP sent to phone number.",
  "data": {
    "id": 1,
    "email": null,
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "aadhar_front_image": "uploads/aadhar_front_image-1234567890.jpg",
    "aadhar_back_image": "uploads/aadhar_back_image-1234567891.jpg",
    "signature_image": "uploads/signature_image-1234567892.png",
    "role": "user",
    "status": "active",
    "is_verified": false,
    "created_at": "2024-01-21T10:30:00.000Z"
  }
}
```

### Accessing Uploaded Images:
Uploaded images can be accessed via: `http://localhost:4000/uploads/filename`

### Error Handling:
- **400**: Validation errors (invalid phone, missing required fields, invalid file type)
- **409**: User with phone number already exists
- **413**: File too large
- **415**: Unsupported file type
- **500**: Server error

### OTP Verification:
After user creation, an OTP is sent to the phone number. Use the `/admin/verify-otp` endpoint to verify the user.