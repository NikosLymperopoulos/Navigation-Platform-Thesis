# README
## Overview

This is a Django-based navigational platform that provides a web application for users to interact with maps and locations. The platform utilizes the HERE API for map rendering and geolocation services.

## Directory Structure

- `mysite/`: The root directory of the Django project.
- `settings.py`: Project settings and configurations.
- `wsgi.py`: WSGI configuration for the project.
- `asgi.py`: ASGI configuration for the project.
- `myapp/`: The main application directory.
- `templates/`: HTML templates for the application.
  - `map.html`: The main map template.
- `static/`: Static files for the application.
  - `homepage.js`: JavaScript code for the homepage.
- `views.py`: View functions for the application.
- `models.py`: Database models for the application.
- `forms.py`: Form definitions for the application.

## Functionality

- Map Rendering: The platform uses the HERE API to render maps and provide geolocation services.
- User Profiles: Users can create profiles and log in to the application.
- Address and Place Management: Users can manage addresses and places, which are stored in the database.
- City Data: The platform stores data about cities, which can be selected by users.

## Technical Details

- Django: The platform is built using Django 4.2.
- HERE API: The platform uses the HERE API for map rendering and geolocation services.
- CSS : The platform uses mainly CSS for front-end styling, and some Bootstrap.
- JavaScript: The platform uses JavaScript for front-end scripting.

## Setup and Deployment

To set up and deploy the platform, follow these steps:

1. Clone the repository to your local machine.
2. Install the required dependencies using `pip install -r requirements.txt`.
3. Set up the database by running `python manage.py migrate`.
4. Create a superuser by running `python manage.py createsuperuser`.
5. Run the development server by running `python manage.py runserver`.
6. Deploy the platform to a production environment using a WSGI server such as Gunicorn.

## API Keys

Replace the placeholder API keys in JavaScript Files with your actual API keys.
