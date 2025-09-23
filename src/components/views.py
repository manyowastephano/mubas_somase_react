'''

@api_view(['POST', 'OPTIONS'])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def register_view(request):
    if request.method == 'OPTIONS':
        # Handle preflight requests
        response = Response()
        response['Access-Control-Allow-Origin'] = get_frontend_url()
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response
        
    if request.method == 'POST':
        try:
            # For file uploads, use request.data directly
            if request.content_type.startswith('multipart/form-data'):
                data = request.data
            else:
                # For JSON requests
                try:
                    data = json.loads(request.body)
                except json.JSONDecodeError:
                    return Response({
                        'error': 'Invalid request format. Please check your input and try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate required fields
            required_fields = ['username', 'email', 'password', 'password2']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return Response({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email matches the required MUBAS format
            email_pattern = r'^mse\d{2}-.*@mubas\.ac\.mw$'
            if not re.match(email_pattern, data['email']):
                return Response({
                    'error': 'Only MUBAS  SOMASE student emails (format: mseYY-username@mubas.ac.mw) are allowed for registration. Please use your official MUBAS email.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email already exists and is verified
            existing_user = CustomUser.objects.filter(email=data['email']).first()
            if existing_user and existing_user.is_email_verified:
                return Response({
                    'error': 'This email is already registered. Please try logging in or use a different email.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if username already exists
            if CustomUser.objects.filter(username=data['username']).exists():
                return Response({
                    'error': 'This username is already taken. Please choose a different username.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If email exists but is not verified, delete the old user
            if existing_user and not existing_user.is_email_verified:
                # Check if the existing user has the same username
                if existing_user.username == data['username']:
                    return Response({
                        'error': 'This username is already associated with an unverified account. Please use a different username or verify your existing account.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                existing_user.delete()
            
            # Validate password strength
            password = data['password']
            if len(password) < 8:
                return Response({
                    'error': 'Password must be at least 8 characters long.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not any(char.isdigit() for char in password):
                return Response({
                    'error': 'Password must contain at least one number.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not any(char.isupper() for char in password):
                return Response({
                    'error': 'Password must contain at least one uppercase letter.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not any(char.islower() for char in password):
                return Response({
                    'error': 'Password must contain at least one lowercase letter.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if passwords match
            if data['password'] != data['password2']:
                return Response({
                    'error': 'Passwords do not match. Please make sure both password fields are identical.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the new user
            serializer = UserRegistrationSerializer(data=data)
            
            if serializer.is_valid():
                # Create user but set as inactive initially
                user = serializer.save()
                user.is_active = False  # User cannot login until email is verified
                user.is_email_verified = False
                user.save()
                
                # Generate verification token and URL
                current_site = get_current_site(request)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = account_activation_token.make_token(user)
                
                # Create HTML email message
                mail_subject = 'Activate your MUBAS SOMASE Voting account'
                
                # HTML content with styling
                html_content = f"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification</title>
                    <style>
                        body {{
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            background-color: #f9f9f9;
                            margin: 0;
                            padding: 0;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }}
                        .header {{
                            text-align: center;
                            padding: 20px 0;
                            background-color: #1e4a76;
                            color: white;
                            border-radius: 8px 8px 0 0;
                        }}
                        .content {{
                            padding: 20px;
                        }}
                        .button {{
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #1e4a76;
                            color: white;
                            text-decoration: none;
                            border-radius: 4px;
                            margin: 20px 0;
                            font-weight: bold;
                        }}
                        .footer {{
                            text-align: center;
                            padding: 20px;
                            font-size: 12px;
                            color: #666;
                        }}
                        .verification-link {{
                            word-break: break-all;
                            color:#1e4a76;
                            font-weight: bold;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>MUBAS SOMASE</h1>
                             <h2>Email Verification</h2>
                        </div>
                        <div class="content">
                            <h2>Hello {user.username},</h2>
                            <p>Thank you for registering as a MUBAS SOMASE member. To complete your registration, please verify your email address by clicking the button below:</p>
                            
                            <center>
                                <a style="color:white" href="http://{current_site.domain}/activate/{uid}/{token}/" class="button">
                                    Verify Email Address
                                </a>
                            </center>
                            
                            <p>Or copy and paste the following link into your browser:</p>
                            <p class="verification-link">http://{current_site.domain}/activate/{uid}/{token}/</p>
                            
                            <p>If you didn't request this registration, please ignore this email.</p>
                            
                            <p>Best regards,<br>The MUBAS SOMASE Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>&copy; {timezone.now().year} SOMASE Voting System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                # Plain text version for email clients that don't support HTML
                text_content = f"""Hi {user.username},

Please click on the link below to confirm your registration for the SOMASE Voting System:

http://{current_site.domain}/activate/{uid}/{token}/

If you didn't register for this account, please ignore this email.

Thank you,
MUBAS SOMASE Team"""
                
                try:
                    # Create email with both HTML and plain text versions
                    email = EmailMultiAlternatives(
                        mail_subject,
                        text_content,
                        'mubassomase@gmail.com',
                        [user.email]
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.send()
                    
                    response = Response({
                        'message': 'Registration successful! Please check your MUBAS email to verify your account. You will be automatically logged in after verification.',
                        'user_id': user.id,
                    }, status=status.HTTP_201_CREATED)
                    
                except Exception as e:
                    # Log the email error
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Email sending error: {str(e)}", exc_info=True)
                    
                    # Delete user if email sending fails
                    user.delete()
                    response = Response({
                        'error': 'We encountered an issue sending the verification email. Please try again in a few moments.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            else:
                # Return detailed validation errors
                error_messages = []
                for field, errors in serializer.errors.items():
                    for error in errors:
                        error_messages.append(f"{field}: {error}")
                
                response = Response({
                    'error': 'Please correct the following errors:',
                    'details': error_messages
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
                
        except Exception as e:
            # Log the exception for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            
            response = Response({
                'error': 'An unexpected error occurred during registration. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response'''
            
            

@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # Changed from IsAuthenticated to AllowAny
@csrf_exempt
def candidate_registration_view(request):
    try:
        # Get email from request data
        email = request.data.get('email')
        
        # Check if email exists in the system
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            response = Response({
                'error': 'This email is not registered in our system. Please register first before applying.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        # Check if user already has any candidate application (for any position)
        if Candidate.objects.filter(user=user).exists():
            response = Response({
                'error': 'This email has already been used to submit a candidate application.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        # Check if user already has a candidate application for this specific position
        position = request.data.get('position')
        if Candidate.objects.filter(user=user, position=position).exists():
            response = Response({
                'error': f'You have already applied for the {dict(Candidate.POSITION_CHOICES).get(position)} position.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        # Pass the user and request in the context to the serializer
        serializer = CandidateRegistrationSerializer(data=request.data, context={'user': user, 'request': request})
        
        if serializer.is_valid():
            candidate = serializer.save()
            
            # Create audit log
            create_audit_log(
                user,
                'candidate_application',
                f"Applied for {dict(Candidate.POSITION_CHOICES).get(position)} position"
            )
            
            response = Response({
                'message': 'Candidate application submitted successfully!',
                'candidate_id': candidate.id,
                'full_name': candidate.full_name,
                'position': candidate.position,
                'status': candidate.status
            }, status=status.HTTP_201_CREATED)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        else:
            response = Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
            
    except Exception as e:
        # Log the exception for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Candidate registration error: {str(e)}", exc_info=True)
        
        response = Response({
            'error': 'An internal server error occurred during candidate registration'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Set CORS headers
        response['Access-Control-Allow-Origin'] = get_frontend_url()
        response['Access-Control-Allow-Credentials'] = 'true'
        return response
    
       
@api_view(['POST', 'OPTIONS'])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def register_view(request):
    if request.method == 'OPTIONS':
        # Handle preflight requests
        response = Response()
        response['Access-Control-Allow-Origin'] = get_frontend_url()
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response
        
    if request.method == 'POST':
        try:
            # For file uploads, use request.data directly
            if request.content_type.startswith('multipart/form-data'):
                data = request.data
            else:
                # For JSON requests
                try:
                    data = json.loads(request.body)
                except json.JSONDecodeError:
                    return Response({
                        'error': 'Invalid request format. Please check your input and try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate required fields
            required_fields = ['username', 'email', 'password', 'password2']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return Response({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email matches the required MUBAS format
            email_pattern = r'^mse\d{2}-.*@mubas\.ac\.mw$'
            if not re.match(email_pattern, data['email']):
                return Response({
                    'error': 'Only MUBAS SOMASE student emails (format: mseYY-username@mubas.ac.mw) are allowed for registration. Please use your official MUBAS email.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email already exists and is verified
            existing_user = CustomUser.objects.filter(email=data['email']).first()
            if existing_user and existing_user.is_email_verified:
                return Response({
                    'error': 'This email is already registered. Please try logging in or use a different email.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if username already exists
            if CustomUser.objects.filter(username=data['username']).exists():
                return Response({
                    'error': 'This username is already taken. Please choose a different username.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If email exists but is not verified, delete the old user
            if existing_user and not existing_user.is_email_verified:
                # Check if the existing user has the same username
                if existing_user.username == data['username']:
                    return Response({
                        'error': 'This username is already associated with an unverified account. Please use a different username or verify your existing account.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                existing_user.delete()
            
            # Validate password strength
            password = data['password']
            if len(password) < 8:
                return Response({
                    'error': 'Password must be at least 8 characters long.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not any(char.isdigit() for char in password):
                return Response({
                    'error': 'Password must contain at least one number.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not any(char.isupper() for char in password):
                return Response({
                    'error': 'Password must contain at least one uppercase letter.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not any(char.islower() for char in password):
                return Response({
                    'error': 'Password must contain at least one lowercase letter.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if passwords match
            if data['password'] != data['password2']:
                return Response({
                    'error': 'Passwords do not match. Please make sure both password fields are identical.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate profile photo if provided
            profile_photo = None
            if 'profile_photo' in request.FILES:
                profile_photo = request.FILES['profile_photo']
                
                # Validate file size (5MB limit)
                if profile_photo.size > 5 * 1024 * 1024:
                    return Response({
                        'error': 'Profile photo must be less than 5MB.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate file type
                allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                if profile_photo.content_type not in allowed_types:
                    return Response({
                        'error': 'Invalid image format. Please use JPEG, PNG, GIF, or WebP.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the new user using serializer
            serializer = UserRegistrationSerializer(data=data)
            
            if serializer.is_valid():
                # Create user but set as inactive initially
                user = serializer.save()
                user.is_active = False  # User cannot login until email is verified
                user.is_email_verified = False
                
                # Handle profile photo upload to Cloudinary
                if profile_photo:
                    try:
                        # Upload to Cloudinary
                        upload_result = cloudinary.uploader.upload(
                            profile_photo,
                            folder='voting_app/profiles/',
                            resource_type='image'
                        )
                        user.profile_photo = upload_result['secure_url']
                        print(f"Profile photo uploaded successfully: {upload_result['secure_url']}")
                    except Exception as e:
                        # Log the error but continue without profile photo
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Cloudinary upload error: {str(e)}")
                        user.profile_photo = None  # Set to None if upload fails
                
                user.save()
                
                # Generate verification token and URL
                current_site = get_current_site(request)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = account_activation_token.make_token(user)
                
                # Create HTML email message
                mail_subject = 'Activate your MUBAS SOMASE Voting account'
                
                # HTML content with styling
                html_content = f"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification</title>
                    <style>
                        body {{
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            background-color: #f9f9f9;
                            margin: 0;
                            padding: 0;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }}
                        .header {{
                            text-align: center;
                            padding: 20px 0;
                            background-color: #1e4a76;
                            color: white;
                            border-radius: 8px 8px 0 0;
                        }}
                        .content {{
                            padding: 20px;
                        }}
                        .button {{
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #1e4a76;
                            color: white;
                            text-decoration: none;
                            border-radius: 4px;
                            margin: 20px 0;
                            font-weight: bold;
                        }}
                        .footer {{
                            text-align: center;
                            padding: 20px;
                            font-size: 12px;
                            color: #666;
                        }}
                        .verification-link {{
                            word-break: break-all;
                            color:#1e4a76;
                            font-weight: bold;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>MUBAS SOMASE</h1>
                             <h2>Email Verification</h2>
                        </div>
                        <div class="content">
                            <h2>Hello {user.username},</h2>
                            <p>Thank you for registering as a MUBAS SOMASE member. To complete your registration, please verify your email address by clicking the button below:</p>
                            
                            <center>
                                <a style="color:white" href="http://{current_site.domain}/activate/{uid}/{token}/" class="button">
                                    Verify Email Address
                                </a>
                            </center>
                            
                            <p>Or copy and paste the following link into your browser:</p>
                            <p class="verification-link">http://{current_site.domain}/activate/{uid}/{token}/</p>
                            
                            <p>If you didn't request this registration, please ignore this email.</p>
                            
                            <p>Best regards,<br>The MUBAS SOMASE Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>&copy; {timezone.now().year} SOMASE Voting System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                # Plain text version for email clients that don't support HTML
                text_content = f"""Hi {user.username},

Please click on the link below to confirm your registration for the SOMASE Voting System:

http://{current_site.domain}/activate/{uid}/{token}/

If you didn't register for this account, please ignore this email.

Thank you,
MUBAS SOMASE Team"""
                
                try:
                    # Create email with both HTML and plain text versions
                    email = EmailMultiAlternatives(
                        mail_subject,
                        text_content,
                        'mubassomase@gmail.com',
                        [user.email]
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.send()
                    
                    response = Response({
                        'message': 'Registration successful! Please check your MUBAS email to verify your account. You will be automatically logged in after verification.',
                        'user_id': user.id,
                    }, status=status.HTTP_201_CREATED)
                    
                except Exception as e:
                    # Log the email error
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Email sending error: {str(e)}", exc_info=True)
                    
                    # Delete user if email sending fails
                    user.delete()
                    response = Response({
                        'error': 'We encountered an issue sending the verification email. Please try again in a few moments.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            else:
                # Return detailed validation errors
                error_messages = []
                for field, errors in serializer.errors.items():
                    for error in errors:
                        error_messages.append(f"{field}: {error}")
                
                response = Response({
                    'error': 'Please correct the following errors:',
                    'details': error_messages
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
                
        except Exception as e:
            # Log the exception for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            
            response = Response({
                'error': 'An unexpected error occurred during registration. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Set CORS headers
            response['Access-Control-Allow-Origin'] = get_frontend_url()
            response['Access-Control-Allow-Credentials'] = 'true'
            return response