from django.urls import path
from . import views

urlpatterns = [
    path('', views.homepage, name='homepage'),
    path('login/', views.login_method, name="login"),
    path('register/', views.register, name="register"),
    path('logout/', views.logout_view, name="logout_view"),
    path('map/', views.map_view, name='map_view'),
    path('save_address/', views.save_address, name='save_address'),
    path('get_addresses/', views.get_addresses, name='get_addresses'),
    path('get_segment_ids/', views.get_segment_ids, name='get_segment_ids'),
    path('profile/', views.profile, name='profile'),
    path('save_city_info/', views.save_city_info, name='save_city_info'),
    path('city_info/', views.get_city_info, name='city_info'),
    path('get_user_data/', views.get_user_data, name='get_user_data'),
    path('add_favorite_place/', views.add_favorite_place, name='add_favorite_place'),
    path('delete_favorite_place/', views.delete_favorite_place, name='delete_favorite_place'),
    path('update-mobility-user/', views.update_mobility_user, name='update_mobility_user'),
]