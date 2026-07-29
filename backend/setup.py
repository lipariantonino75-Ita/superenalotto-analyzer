from setuptools import setup, find_packages 
 
setup( 
    name="superenalotto-analyzer", 
    version="1.0.0", 
    packages=find_packages(), 
    install_requires=[ 
        "Flask>=3.0.0", 
        "Flask-CORS>=4.0.0", 
        "gunicorn>=21.2.0", 
        "numpy>=1.26.4", 
        "pandas>=2.2.0", 
        "scipy>=1.12.0", 
        "sqlalchemy>=2.0.27", 
        "python-dotenv>=1.0.0", 
        "python-dateutil>=2.8.2", 
        "requests>=2.31.0", 
        "setuptools>=69.0.0", 
        "wheel>=0.42.0", 
    ], 
    python_requires=">=3.9", 
) 
