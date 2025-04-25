<!DOCTYPE html>
<html>
<head>
    <title>Create Partenaire</title>

    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="{{ asset('css/index.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/create.css') }}">


    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap4.min.css">
    <link rel="stylesheet" href="font-awesome-4.6.3/css/font-awesome.min.css">   
 
    <style>
        .error-message {
            color: red;
        }
        .has-error input, .has-error textarea {
            border-color: red;
        }
        .hidden {
            display: none;
        }
        .card-container {
            display: none;
            width: 100%;
        }
      
        .fail-icon {
            color: #de0000;
            font-size: 48px;
            margin-bottom: 20px;
            display:none;
        }
        .modal-content{
            text-align:center;
        }
        .page-link {
    color: #17a2b8 ;
}




 
    </style>
</head>
<body>
    @include('sidebar')
  
    <div class="container"> 
         <div class="modal fade" id="failModal" tabindex="-1" role="dialog" aria-labelledby="failModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="successModalLabel">Erreur!</h5>
                        <button type="button" class="close" data-dismiss="modal-f" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="fail-icon">
                            <i class="bi bi-x-circle"></i>
                        </div>
                        @if (session('failed'))
                        {{ session('failed') }}
                        @elseif(session('error'))
                        {{ session('error') }}
                        @endif
                    </div>
                </div>
            </div>
        </div>
        <h1>Create New Partenaire</h1>
        <form action="{{ route('partenaires.store') }}" method="POST">
            @csrf
            <div class="form-group">
                <label for="arabic-description">Arabic Description</label>
                <input type="checkbox" id="arabic-description" onclick="toggleDescription()">
            </div>
            
            <div class="form-group" id="description">
                <label for="description">Description</label>
                <input type="text" name="description" class="form-control @error('description') is-invalid @enderror" required value="{{ old('description') }}">
                @error('description')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group hidden" id="description-arr">
                <label for="description-arr">Description (Arabic)</label>
                <input type="text" name="description_arr" class="form-control @error('description_arr') is-invalid @enderror" value="{{ old('description_arr') }}">
                @error('description_arr')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <div class="form-group">
                <label for="code">Code</label>
                <input type="text" name="code" class="form-control @error('code') is-invalid @enderror" required value="{{ old('code') }}">
                @error('code')
                    <span class="error-message">{{ $message }}</span>
                @enderror
            </div>
            
            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</div>
</div>
    <script>
         $(document).ready(function () {
            $('.close').click(function (e) {
                $('#failModal').modal('hide');
                $('.fail-icon').fadeOut(1000); 
        })
            $('#menu-toggle').click(function (e) {
                e.preventDefault();
                $('#sidebar').toggle(1000);
            });
            @if(session('failed') || session('error'))
                $('#failModal').modal('show');
                $('.fail-icon').fadeIn(1000); 
            @endif  })
        function toggleDescription() {
            var checkBox = document.getElementById('arabic-description');
            var description = document.getElementById('description');
            var descriptionArr = document.getElementById('description-arr');
    
            if (checkBox.checked) {
                description.classList.add('hidden');
                descriptionArr.classList.remove('hidden');
            } else {
                description.classList.remove('hidden');
                descriptionArr.classList.add('hidden');
            }
        }
  
    </script>
</body>


</html>
