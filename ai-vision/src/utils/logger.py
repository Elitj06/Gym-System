"""
Logger utility for AI Vision Service
"""

import logging
import sys
from datetime import datetime


def setup_logger(name: str, level: str = 'INFO') -> logging.Logger:
    """
    Setup logger with custom formatting
    
    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger
