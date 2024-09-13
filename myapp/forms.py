# forms.py
# forms.py
from django import forms
from .models import Place, UserProfile
from django.db.models import Count
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm

class PlaceForm(forms.ModelForm):
    class Meta:
        model = Place
        fields = ['name']

class RegisterForm(UserCreationForm):
    email = forms.EmailField(required=True)  # Make sure the email is required
    first_name = forms.CharField(max_length=30, required=False, help_text='Optional.')
    last_name = forms.CharField(max_length=30, required=False, help_text='Optional.')
    mobility_user = forms.BooleanField(required=False)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "password1", "password2", "mobility_user"]

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.mobility_user = self.cleaned_data["mobility_user"]
        
        if commit:
            user.save()
        return user
    
class LoginForm(AuthenticationForm):
    class Meta:
        model = User
        field = ["username", "password"]

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['home', 'work', 'mobility_user']
