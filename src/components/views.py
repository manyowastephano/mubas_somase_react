
@api_view(['POST', 'OPTIONS'])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def register_view(request):
    from django.conf import settings
    
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = settings.FRONTEND_URL
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response
        
    if request.method == 'POST':
        user = None
        try:
            # For file uploads, use request.data directly
            if request.content_type.startswith('multipart/form-data'):
                data = request.data
            else:
                try:
                    data = json.loads(request.body)
                except json.JSONDecodeError:
                    return Response({
                        'error': 'Invalid request format. Please check your input and try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate required fields
            required_fields = ['username', 'email', 'password']
            for field in required_fields:
                if field not in data or not data[field]:
                    return Response({
                        'error': f'Missing required field: {field}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user already exists
            if CustomUser.objects.filter(email=data['email']).exists():
                return Response({
                    'error': 'An account with this email already exists. Please use a different email.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if CustomUser.objects.filter(username=data['username']).exists():
                return Response({
                    'error': 'Username already taken. Please choose a different username.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the new user using serializer
            serializer = UserRegistrationSerializer(data=data)
            
            if serializer.is_valid():
                # Create user but set as inactive initially
                user = serializer.save()
                user.is_active = False
                user.is_email_verified = False
                
                # Handle profile photo upload to Cloudinary
                if 'profile_photo' in request.FILES:
                    profile_photo = request.FILES['profile_photo']
                    try:
                        upload_result = cloudinary.uploader.upload(
                            profile_photo,
                            folder='voting_app/profiles/',
                            resource_type='image',
                            timeout=30
                        )
                        user.profile_photo = upload_result['secure_url']
                        logger.info(f"Profile photo uploaded successfully: {upload_result['secure_url']}")
                    except Exception as e:
                        logger.error(f"Cloudinary upload error: {str(e)}", exc_info=True)
                        user.profile_photo = None
                
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
                                <a style="color:white" href="{settings.FRONTEND_URL}/activate/{uid}/{token}" class="button">
                                    Verify Email Address
                                </a>
                            </center>
                            
                            <p>Or copy and paste the following link into your browser:</p>
                            <p class="verification-link">{settings.FRONTEND_URL}/activate/{uid}/{token}</p>
                            
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
                
                # Plain text version
                text_content = f"""Hi {user.username},

Please click on the link below to confirm your registration for the SOMASE Voting System:

{settings.FRONTEND_URL}/activate/{uid}/{token}

If you didn't register for this account, please ignore this email.

Thank you,
MUBAS SOMASE Team"""
                
                # Enhanced email sending with detailed error handling
                try:
                    # Log email configuration (without password)
                    logger.info(f"Attempting to send verification email to {user.email}")
                    logger.info(f"Email host: {settings.EMAIL_HOST}")
                    logger.info(f"Email port: {settings.EMAIL_PORT}")
                    logger.info(f"Email use TLS: {settings.EMAIL_USE_TLS}")
                    logger.info(f"From email: {settings.DEFAULT_FROM_EMAIL}")
                    
                    # Test SMTP connection before sending
                    logger.info("Testing SMTP connection...")
                    if settings.EMAIL_USE_TLS:
                        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
                        server.starttls()
                    else:
                        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
                    
                    # Test authentication
                    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                    server.quit()
                    logger.info("SMTP connection test successful")
                    
                    # Create and send email
                    email = EmailMultiAlternatives(
                        mail_subject,
                        text_content,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        reply_to=[settings.DEFAULT_FROM_EMAIL]
                    )
                    email.attach_alternative(html_content, "text/html")
                    
                    # Send with timeout
                    email.connection = None  # Force new connection
                    email.send(fail_silently=False)
                    
                    logger.info(f"Verification email sent successfully to {user.email}")
                    
                    response = Response({
                        'message': 'Registration successful! Please check your MUBAS email to verify your account. You will be automatically logged in after verification.',
                        'user_id': user.id,
                        'email_sent': True
                    }, status=status.HTTP_201_CREATED)
                    
                except smtplib.SMTPAuthenticationError as e:
                    logger.error(f"SMTP Authentication Failed: {str(e)}")
                    if user:
                        user.delete()
                    response = Response({
                        'error': 'Email service authentication failed. This is a server configuration issue. Please contact support.',
                        'error_type': 'smtp_authentication'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except smtplib.SMTPConnectError as e:
                    logger.error(f"SMTP Connection Error: {str(e)}")
                    if user:
                        user.delete()
                    response = Response({
                        'error': 'Cannot connect to email service. Please check your internet connection and try again later.',
                        'error_type': 'smtp_connection'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except smtplib.SMTPServerDisconnected as e:
                    logger.error(f"SMTP Server Disconnected: {str(e)}")
                    if user:
                        user.delete()
                    response = Response({
                        'error': 'Email server disconnected unexpectedly. Please try again.',
                        'error_type': 'smtp_disconnected'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except smtplib.SMTPException as e:
                    logger.error(f"SMTP Error: {str(e)}")
                    if user:
                        user.delete()
                    response = Response({
                        'error': 'Email delivery failed. Please check if your email address is valid and try again.',
                        'error_type': 'smtp_general'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except TimeoutError as e:
                    logger.error(f"Email sending timeout: {str(e)}")
                    if user:
                        user.delete()
                    response = Response({
                        'error': 'Email service timeout. Please try again in a few moments.',
                        'error_type': 'timeout'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except Exception as e:
                    logger.error(f"Unexpected email error: {str(e)}", exc_info=True)
                    if user:
                        user.delete()
                    response = Response({
                        'error': 'Failed to send verification email due to an unexpected error. Please try again or contact support.',
                        'error_type': 'unexpected'
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
                
        except Exception as e:
            # Log the exception for debugging
            logger.error(f"Registration process error: {str(e)}", exc_info=True)
            
            # Clean up user if it was created
            if user and user.pk:
                try:
                    user.delete()
                    logger.info("Cleaned up user due to registration error")
                except Exception as delete_error:
                    logger.error(f"Error cleaning up user: {str(delete_error)}")
            
            response = Response({
                'error': 'An unexpected error occurred during registration. Please try again later.',
                'error_type': 'registration_process'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Set CORS headers for all responses
        response['Access-Control-Allow-Origin'] = settings.FRONTEND_URL
        response['Access-Control-Allow-Credentials'] = 'true'
        return response

# Additional endpoint for email configuration testing
@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
@csrf_exempt
def test_email_configuration(request):
    """
    Endpoint to test email configuration (for admin debugging)
    """
    from django.core.mail import send_mail
    from django.conf import settings
    import smtplib
    
    test_results = {
        'smtp_connection': False,
        'smtp_authentication': False,
        'email_send': False,
        'details': [],
        'config': {
            'host': settings.EMAIL_HOST,
            'port': settings.EMAIL_PORT,
            'use_tls': settings.EMAIL_USE_TLS,
            'user': settings.EMAIL_HOST_USER,
            'from_email': settings.DEFAULT_FROM_EMAIL,
            'timeout': 15
        }
    }
    
    try:
        # Test 1: SMTP Connection
        logger.info("Testing SMTP connection...")
        if settings.EMAIL_USE_TLS:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
        
        test_results['smtp_connection'] = True
        test_results['details'].append("✓ SMTP connection successful")
        
        # Test 2: SMTP Authentication
        logger.info("Testing SMTP authentication...")
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        test_results['smtp_authentication'] = True
        test_results['details'].append("✓ SMTP authentication successful")
        server.quit()
        
        # Test 3: Send Test Email
        logger.info("Testing email send...")
        send_mail(
            'MUBAS SOMASE - Email Configuration Test',
            'This is a test email from your MUBAS SOMASE application.\n\nIf you received this, your email configuration is working correctly.',
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL],  # Send to yourself
            fail_silently=False,
        )
        test_results['email_send'] = True
        test_results['details'].append("✓ Test email sent successfully")
        
        return Response({
            'success': True,
            'message': 'Email configuration test passed',
            'results': test_results
        })
        
    except smtplib.SMTPConnectError as e:
        test_results['details'].append(f"✗ SMTP Connection Failed: {str(e)}")
        return Response({
            'success': False,
            'error': 'Cannot connect to SMTP server. Check host and port.',
            'results': test_results
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except smtplib.SMTPAuthenticationError as e:
        test_results['details'].append(f"✗ SMTP Authentication Failed: {str(e)}")
        return Response({
            'success': False,
            'error': 'SMTP authentication failed. Check username and password.',
            'results': test_results
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except smtplib.SMTPException as e:
        test_results['details'].append(f"✗ SMTP Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'SMTP error occurred during testing.',
            'results': test_results
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        test_results['details'].append(f"✗ Unexpected Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Unexpected error during email test.',
            'results': test_results
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# In your Django views.py
@api_view(['DELETE'])
@login_required
def delete_user_account(request):
    try:
        user = request.user
        user.delete()
        return Response({'message': 'Account deleted successfully'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def test_email_config(request):
    """
    Endpoint to test email configuration (for admin use)
    """
    from django.core.mail import send_mail
    from django.conf import settings
    import smtplib
    import logging
    
    logger = logging.getLogger(__name__)
    
    test_results = {
        'smtp_connection': False,
        'smtp_authentication': False,
        'email_send': False,
        'details': []
    }
    
    try:
        # Test 1: SMTP Connection
        logger.info("Testing SMTP connection...")
        if settings.EMAIL_USE_TLS:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
        
        test_results['smtp_connection'] = True
        test_results['details'].append("SMTP connection successful")
        
        # Test 2: SMTP Authentication
        logger.info("Testing SMTP authentication...")
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        test_results['smtp_authentication'] = True
        test_results['details'].append("SMTP authentication successful")
        server.quit()
        
        # Test 3: Send Test Email
        logger.info("Testing email send...")
        send_mail(
            'MUBAS SOMASE - Email Test',
            'This is a test email from your MUBAS SOMASE application.',
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL],  # Send to yourself
            fail_silently=False,
        )
        test_results['email_send'] = True
        test_results['details'].append("Test email sent successfully")
        
        return Response({
            'success': True,
            'results': test_results,
            'config': {
                'host': settings.EMAIL_HOST,
                'port': settings.EMAIL_PORT,
                'use_tls': settings.EMAIL_USE_TLS,
                'user': settings.EMAIL_HOST_USER,
                'from_email': settings.DEFAULT_FROM_EMAIL
            }
        })
        
    except smtplib.SMTPConnectError as e:
        test_results['details'].append(f"SMTP Connection Failed: {str(e)}")
        return Response({
            'success': False,
            'error': 'Cannot connect to SMTP server',
            'results': test_results
        }, status=500)
    except smtplib.SMTPAuthenticationError as e:
        test_results['details'].append(f"SMTP Authentication Failed: {str(e)}")
        return Response({
            'success': False,
            'error': 'SMTP authentication failed',
            'results': test_results
        }, status=500)
    except Exception as e:
        test_results['details'].append(f"Unexpected error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Email test failed',
            'results': test_results
        }, status=500)