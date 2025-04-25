<!DOCTYPE html>
<html>
<head>
    <title>CRO - Login</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="icon" href="{{ asset('logo.png') }}" type="image/png">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .login-container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .form-group {
            text-align: left;
        }
        .login-title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
        }
        .login-btn {
            background-color: #17a2b8;
            border-color: #17a2b8;
        }
        .login-btn:hover {
            background-color: #138496;
            border-color: #117a8b;
        }

    </style>
</head>
<body>

    <div class="login-container">
        <img src="{{ asset('logo.png') }}" alt="Logo" class='cro-logo'>

        <h1 class="login-title">Login</h1>
        
        
        @if($errors->any())
            <div class="alert alert-danger" style='display:flex;justify-content:center;align-items:center;align-self:center;color:red;background-color:white;border:none;height:30px;'>
                @foreach ($errors->all() as $error)
                    <p>{{ $error }}</p>
                @endforeach
            </div>
        @endif
        <form method="POST" action="{{ route('login') }}">
            @csrf
            
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" class="form-control @error('username') is-invalid @enderror" id="username" name="username" required>
                @error('username')
                    <span class="invalid-feedback" role="alert">
                        <strong>{{ $message }}</strong>
                    </span>
                @enderror
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" class="form-control @error('password') is-invalid @enderror" id="password" name="password" required>
                @error('password')
                <span class="invalid-feedback" role="alert">
                    <strong>{{ $message }}</strong>
                </span>
                @enderror
            </div>
            <button type="submit" class="btn btn-primary login-btn btn-block">Login</button>
        </form>
    </div>
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script>
   
    if (document.querySelector('.cro-logo')) {
        anime({
            targets: '.cro-logo',
            scale: [0, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .8)',
            delay: 500
        });
    }
    if (document.querySelector('.login-container')) {
        anime({
            targets: '.login-container',
            scale: [0, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .8)',
            delay: 200
        });
    }

    
    </script>
</body>
</html>
