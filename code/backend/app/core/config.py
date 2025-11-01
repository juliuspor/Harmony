"""Application configuration"""

# Submission Limits
MAX_SUBMISSIONS = 1000
MIN_SUBMISSIONS_FOR_CLUSTERING = 2
MAX_WORDS_PER_SUBMISSION = 1000

# Clustering Settings
K_RANGE = [2, 3, 4, 5, 6, 7, 8, 9, 10]
RANDOM_STATE = 42
KMEANS_N_INIT = 10

# Model Settings
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

