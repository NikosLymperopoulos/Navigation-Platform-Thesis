from django.contrib.auth.models import User
from django.db import models

VOTES_THRESHOLD = 10

class Address(models.Model):
    city = models.CharField(max_length=100)
    street = models.CharField(max_length=100)
    house_number = models.IntegerField()
    segment_id = models.CharField(max_length=100, null=True)
    votes = models.IntegerField(default=0)  # Renamed from new_int_field to votes
    closed = models.BooleanField(default=False)
    latitude = models.DecimalField(null=True, max_digits=20, decimal_places=6)
    longitude = models.DecimalField(null=True, max_digits=20, decimal_places=6)

    def __str__(self):
        return f'{self.city}, {self.street}, {self.house_number}'

    def upvote(self):
        self.votes += 1
        if self.votes == VOTES_THRESHOLD:
            self.closed = True
        self.save()

    def downvote(self):
        self.votes -= 1 
        if self.votes == VOTES_THRESHOLD-1:
            self.closed = False
        self.save()
    
    class Meta:
        ordering = ['street', 'house_number']

class Place(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    home = models.CharField(max_length=255, blank=True, null=True)
    work = models.CharField(max_length=255, blank=True, null=True)
    favorite_places = models.ManyToManyField(Place, blank=True, related_name='favorited_by')
    mobility_user = models.BooleanField(default=True)

    def __str__(self):
        return self.user.username
    
class City(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    postal_code = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=0)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=0)

    def __str__(self):
        return f"{self.name} ({self.postal_code})"